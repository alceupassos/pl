// Guarda de sessão reutilizável para as rotas de API dos MVPs.
// A regra (JWT + checagem de IP para credenciais provisórias) vive em
// lib/auth.ts:verifySession — compartilhada com o gate do /m.

import type { NextRequest } from "next/server";

import { getAuthCookieName, verifySession } from "@/lib/auth";

export type SessionPayload = NonNullable<ReturnType<typeof verifySession>>;

/** Retorna o payload do JWT se a sessão for válida, senão null. */
export function getSession(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(getAuthCookieName())?.value;
  return verifySession(token, request.headers);
}
