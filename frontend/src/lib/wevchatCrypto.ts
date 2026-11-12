/**
 * WevChat End-to-End Encryption (E2EE) WebCrypto Helpers
 * Uses ECDH on the P-256 curve for key exchange and AES-GCM for symmetric encryption.
 */

const ECDH_ALGO = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = { name: 'AES-GCM', length: 256 };

/** Generate a new ECDH KeyPair for the user */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(ECDH_ALGO, true, ['deriveKey', 'deriveBits']);
}

/** Export a CryptoKey to a Base64 string */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/** Import a Base64 string to a CryptoKey */
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return window.crypto.subtle.importKey('raw', bytes.buffer, ECDH_ALGO, true, []);
}


/** Export a CryptoKey (Private) to a Base64 string */
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('pkcs8', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/** Import a Base64 string to a CryptoKey (Private) */
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return window.crypto.subtle.importKey('pkcs8', bytes.buffer, ECDH_ALGO, false, ['deriveKey', 'deriveBits']);
}

/** Derive a shared AES-GCM symmetric key from our private key and peer's public key */
export async function deriveSharedSecret(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    AES_ALGO,
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string message.
 * Returns { ciphertext: string (base64), iv: string (base64) }
 */
export async function encryptMessage(text: string, sharedSecret: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    encodedText
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuf))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypts a ciphertext string.
 */
export async function decryptMessage(ciphertextB64: string, ivB64: string, sharedSecret: CryptoKey): Promise<string> {
  const ivStr = atob(ivB64);
  const iv = new Uint8Array(ivStr.length);
  for (let i = 0; i < ivStr.length; i++) iv[i] = ivStr.charCodeAt(i);

  const cipherStr = atob(ciphertextB64);
  const ciphertext = new Uint8Array(cipherStr.length);
  for (let i = 0; i < cipherStr.length; i++) ciphertext[i] = cipherStr.charCodeAt(i);

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuf);
}
