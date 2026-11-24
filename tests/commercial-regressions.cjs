const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTS(file, dependencies = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = { exports: {} };
  const resolve = name => {
    if (Object.prototype.hasOwnProperty.call(dependencies, name)) return dependencies[name];
    throw new Error('Unexpected dependency: ' + name);
  };
  new Function('require', 'module', 'exports', js)(resolve, mod, mod.exports);
  return mod.exports;
}

test('shift totals exclude previous shifts and include receipts since opening', async () => {
  const now = Date.now(), opening = now - 7200000;
  const receipts = [
    { timestamp: opening - 1, total: 900, paymentMethod: 'cash' },
    { timestamp: opening, total: 100, paymentMethod: 'cash' },
    { timestamp: now - 1000, total: 50, paymentMethod: 'card' },
    { timestamp: now + 86400000, total: 500, paymentMethod: 'cash' }
  ];
  const { ReportService } = loadTS('src/services/ReportService.ts', {
    '../repositories/ReceiptRepository': { ReceiptRepository: { getAll: async () => receipts } },
    '../repositories/RoomRepository': { RoomRepository: {} }
  });
  const report = await ReportService.getCurrentShiftReport(200, 290, opening);
  assert.equal(report.revenue, 150);
  assert.equal(report.expectedCash, 300);
  assert.equal(report.difference, -10);
  await assert.rejects(ReportService.getCurrentShiftReport(-1, 0, opening));
  await assert.rejects(ReportService.getCurrentShiftReport(0, 0, NaN));
});

test('local owner password is configured once and wrong passwords are rejected', async () => {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  }});
  try {
    const service = loadTS('src/services/LocalAdminService.ts');
    const password = 'test-only-long-password';
    assert.equal(service.hasLocalAdmin(), false);
    await assert.rejects(service.configureLocalAdmin('short', 'short'));
    await assert.rejects(service.configureLocalAdmin(password, 'mismatch-password'));
    await service.configureLocalAdmin(password, password);
    assert.equal(service.hasLocalAdmin(), true);
    assert.equal(await service.verifyLocalAdmin(password), true);
    assert.equal(await service.verifyLocalAdmin('wrong-password'), false);
    assert.ok(!Array.from(data.values()).join('').includes(password));
    await assert.rejects(service.configureLocalAdmin(password, password));
  } finally {
    delete globalThis.localStorage;
  }
});


test('drawer expenses reduce expected cash; outside payments do not', async () => {
  const now = Date.now(), opening = now - 3600000;
  const { ReportService } = loadTS('src/services/ReportService.ts', {
    '../repositories/ReceiptRepository': { ReceiptRepository: { getAll: async () => [{ timestamp: now - 100, total: 500, paymentMethod: 'cash' }] } },
    '../repositories/RoomRepository': { RoomRepository: {} }
  });
  const report = await ReportService.getCurrentShiftReport(200, 600, opening, [
    { timestamp: now - 100, amount: 100, source: 'drawer' },
    { timestamp: now - 100, amount: 300, source: 'external' },
    { timestamp: opening - 1, amount: 999, source: 'drawer' }
  ]);
  assert.equal(report.expenses, 400);
  assert.equal(report.drawerExpenses, 100);
  assert.equal(report.expectedCash, 600);
  assert.equal(report.difference, 0);
});

test('cash flow uses paid expenses once and excludes other periods', () => {
  const { summarizeCashFlow, isExpense } = loadTS('src/services/ExpenseService.ts', { '../db/db': { IndexedDBManager: {} } });
  const expense = { id:'test',category:'stock',source:'drawer',amount:250,description:'Stock',timestamp:100,createdAt:100 };
  assert.equal(isExpense(expense), true);
  assert.equal(isExpense({...expense,amount:-1}), false);
  assert.equal(isExpense({...expense,amount:1.001}), false);
  assert.deepEqual(summarizeCashFlow([{timestamp:100,total:1000},{timestamp:201,total:500}], [expense,{...expense,timestamp:99,amount:100}],100,200), {revenue:1000,expenses:250,drawerExpenses:250,net:750});
});


test('open sessions charge for actual play time, excluding pauses; legacy limits retain their terms', () => {
  const { SessionService } = loadTS('src/services/SessionService.ts', {
    '../repositories/SessionRepository': { SessionRepository: {} },
    '../repositories/RoomRepository': { RoomRepository: {} },
    '../repositories/InventoryRepository': { InventoryRepository: {} },
    '../repositories/AuditLogRepository': { AuditLogRepository: {} }
  });
  const session = { status:'active', startTime:1000, duration:0, totalPausedDuration:600, hourlyRateAtStart:60, items:[], discountType:'fixed', discountValue:0 };
  assert.equal(SessionService.calculateCharges(session, 1801000).roomCharges,20);
  assert.equal(SessionService.calculateCharges({...session,limitMinutes:60},1801000).roomCharges,60);
  assert.equal(typeof SessionService.addMinutes,'undefined');
});

test('receipt identifiers advance across legacy and LoungeLink prefixes', async () => {
  const year = new Date().getFullYear();
  const { ReceiptRepository } = loadTS('src/repositories/ReceiptRepository.ts', {
    '../db/db': { IndexedDBManager: { getAll: async () => [{receiptNumber:'V30-'+year+'-000042',timestamp:1},{receiptNumber:'LL-'+year+'-000043',timestamp:2}] } }
  });
  assert.equal(await ReceiptRepository.getNextReceiptNumber(),'LL-'+year+'-000044');
});
