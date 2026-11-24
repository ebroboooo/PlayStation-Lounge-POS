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
