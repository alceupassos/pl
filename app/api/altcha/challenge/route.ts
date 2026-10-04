import { createChallenge, pbkdf2 } from "altcha/lib";
import { NextResponse } from "next/server";

import { getAltchaHmacSecret } from "@/lib/auth";

export async function GET() {
  const challenge = await createChallenge({
    algorithm: "PBKDF2/SHA-256",
    cost: 20_000,
    expiresAt: Date.now() + 5 * 60 * 1000,
    hmacSignatureSecret: getAltchaHmacSecret(),
    deriveKey: pbkdf2.deriveKey,
    keyLength: 32,
    keyPrefixLength: 4,
  });

  return NextResponse.json(challenge, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
