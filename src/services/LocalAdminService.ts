// A local operator lock, not server authentication. Anyone with browser-profile
// or developer-tools access can bypass it. Use only on a trusted single terminal.
const KEY = 'loungelink_local_admin_v1';
const ITERATIONS = 600_000;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Local admin lock requires localhost or HTTPS');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return toHex(new Uint8Array(result));
}

export function hasLocalAdmin(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export async function configureLocalAdmin(password: string, confirmation: string): Promise<void> {
  if (hasLocalAdmin()) throw new Error('Local admin is already configured');
  if (password.length < 12 || password.length > 128 || password !== confirmation) {
    throw new Error('Use a matching password of 12–128 characters');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  if (hasLocalAdmin()) throw new Error('Local admin was configured in another operation');
  localStorage.setItem(KEY, JSON.stringify({ salt: toHex(salt), hash }));
}

export async function verifyLocalAdmin(password: string): Promise<boolean> {
  if (password.length > 128) return false;
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  const stored = JSON.parse(raw);
  if (!/^[0-9a-f]{32}$/.test(stored.salt) || !/^[0-9a-f]{64}$/.test(stored.hash)) {
    throw new Error('Local admin configuration is invalid');
  }
  const hash = await derive(password, fromHex(stored.salt));
  return hash === stored.hash;
}
