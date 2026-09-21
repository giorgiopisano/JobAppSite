// Mirrors scripts/sync.mjs: PBKDF2-SHA256 -> AES-256-GCM. Runs entirely in the
// browser, so the passphrase never leaves the device.

const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function decryptPayload(envelope, passphrase) {
  if (envelope.v !== 1) throw new Error('Unsupported payload version')
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(envelope.salt), iterations: envelope.iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(envelope.iv) }, key, fromB64(envelope.ct))
  return JSON.parse(new TextDecoder().decode(plain))
}
