import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id with the OWASP baseline (m=19 MiB, t=2, p=1). Algorithm 2 = Argon2id.
const OPTS = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPin = (pin: string) => hash(pin, OPTS);

export async function verifyPin(pinHash: string, pin: string): Promise<boolean> {
  try {
    return await verify(pinHash, pin);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;

/** Burns the same CPU as a real verify, so unknown names aren't distinguishable by timing. */
export async function dummyVerify(pin: string) {
  dummy ??= hashPin("000000-dummy");
  await verifyPin(await dummy, pin);
}
