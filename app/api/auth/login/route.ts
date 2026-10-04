import { NextRequest, NextResponse } from "next/server";

import {
  getAuthCookieName,
  getAuthCredentials,
  getClientIp,
  getJwtTtlSeconds,
  signJwt,
  verifyAltchaPayload,
} from "@/lib/auth";
import { appendAccessLog } from "@/lib/access-log";
import { verifyProvisionalCredentialForIp } from "@/lib/provisional-passwords";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const login = typeof body?.login === "string" ? body.login.trim() : "";
  const password = typeof body?.password === "string" ? body.password.trim() : "";
  const altchaToken = typeof body?.altchaToken === "string" ? body.altchaToken : "";
  const verification = await verifyAltchaPayload(altchaToken);

  if (!verification.verified) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "altcha_failed",
        reason: verification.reason,
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const credentials = getAuthCredentials();
  const isMainCredential = login === credentials.login && password === credentials.password;
  const clientIp = getClientIp(request.headers);
  const provisionalCredentialResult = isMainCredential
    ? null
    : await verifyProvisionalCredentialForIp(login, password, clientIp);

  if (!isMainCredential && !provisionalCredentialResult?.ok) {
    await appendAccessLog(request.headers, {
      event: provisionalCredentialResult?.reason === "ip_mismatch" ? "login_failed_ip_mismatch" : "login_failed",
      path: "/api/auth/login",
      metadata: {
        login,
        reason: provisionalCredentialResult?.reason || "invalid_credentials",
      },
    });

    return NextResponse.json(
      {
        authenticated: false,
        error: "invalid_credentials",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  let authenticatedLogin = credentials.login;
  if (!isMainCredential && provisionalCredentialResult?.ok) {
    authenticatedLogin = provisionalCredentialResult.credential.login;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + getJwtTtlSeconds();
  const token = signJwt({
    sub: authenticatedLogin,
    credentialType: isMainCredential ? "main" : "provisional",
    ip: clientIp,
    iat: now,
    exp,
  });

  await appendAccessLog(request.headers, {
    event: "login_success",
    path: "/api/auth/login",
    metadata: {
      login: authenticatedLogin,
      credentialType: isMainCredential ? "main" : "provisional",
    },
  });

  const response = NextResponse.json(
    {
      authenticated: true,
      expiresAt: exp,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set({
    name: getAuthCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getJwtTtlSeconds(),
  });

  return response;
}
