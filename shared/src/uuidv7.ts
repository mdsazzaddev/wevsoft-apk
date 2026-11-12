/**
 * UUID version 7 (RFC 9562) — time-ordered IDs for better B-tree insert locality.
 * Prisma 5.20 has no @default(uuid(7)); backend injects this on create via db.ts extension.
 */

const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fillRandomBytes(buf: Uint8Array): void {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buf);
    return;
  }
  throw new Error('crypto.getRandomValues is unavailable');
}

function hex(b: number): string {
  return b.toString(16).padStart(2, '0');
}

/** Generate a UUIDv7 string. Optional `date` for tests only. */
export function uuidv7(date: Date = new Date()): string {
  const unixMs = BigInt(date.getTime());
  const uuid = new Uint8Array(16);

  uuid[0] = Number((unixMs >> 40n) & 0xffn);
  uuid[1] = Number((unixMs >> 32n) & 0xffn);
  uuid[2] = Number((unixMs >> 24n) & 0xffn);
  uuid[3] = Number((unixMs >> 16n) & 0xffn);
  uuid[4] = Number((unixMs >> 8n) & 0xffn);
  uuid[5] = Number(unixMs & 0xffn);

  const rand = new Uint8Array(10);
  fillRandomBytes(rand);

  uuid[6] = (rand[0]! & 0x0f) | 0x70;
  uuid[7] = rand[1]!;
  uuid[8] = (rand[2]! & 0x3f) | 0x80;
  uuid[9] = rand[3]!;
  uuid[10] = rand[4]!;
  uuid[11] = rand[5]!;
  uuid[12] = rand[6]!;
  uuid[13] = rand[7]!;
  uuid[14] = rand[8]!;
  uuid[15] = rand[9]!;

  return `${hex(uuid[0]!)}${hex(uuid[1]!)}${hex(uuid[2]!)}${hex(uuid[3]!)}-${hex(uuid[4]!)}${hex(uuid[5]!)}-${hex(uuid[6]!)}${hex(uuid[7]!)}-${hex(uuid[8]!)}${hex(uuid[9]!)}-${hex(uuid[10]!)}${hex(uuid[11]!)}${hex(uuid[12]!)}${hex(uuid[13]!)}${hex(uuid[14]!)}${hex(uuid[15]!)}`;
}

export function isUuidV7(value: string): boolean {
  if (!UUID_V7_RE.test(value)) return false;
  const parts = value.toLowerCase().split('-');
  const versionNibble = parseInt(parts[2]!.slice(0, 1), 16);
  return versionNibble === 7;
}
