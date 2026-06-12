/** POST assíncrono para /api/access-log — não bloqueia UI. */
export function logClientAccess(
  event: string,
  path: string,
  metadata?: Record<string, unknown>,
) {
  void fetch("/api/access-log", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, path, metadata }),
    keepalive: true,
  }).catch(() => undefined);
}
