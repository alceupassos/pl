// Stream vivo do /m — SSE multiplexado (uma conexão por app).
// Snapshot-then-delta: a cada conexão, todos os snapshots primeiro; depois
// deltas na cadência de cada canal. Geradores determinísticos (lib/live-mock).

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import {
  CHANNEL_CADENCE_MS,
  alertsBetween,
  buildAllSnapshots,
  buildDelta,
  isVotacaoAtiva,
  type MockOptions,
} from "@/lib/live-mock";
import type { Channel, Envelope } from "@/lib/live-schemas";
import { sendPushToAll } from "@/lib/push";
import { readWatchlist } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

const DELTA_CHANNELS = (Object.keys(CHANNEL_CADENCE_MS) as (keyof typeof CHANNEL_CADENCE_MS)[]).filter(
  (ch) => ch !== "alerts",
) as Exclude<Channel, "watchlist" | "alerts">[];

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const opts: MockOptions = {
    demoVotacao: request.nextUrl.searchParams.get("demo") === "votacao",
  };

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
          if (interval) clearInterval(interval);
        }
      };
      let seq = 0;
      const send = (env: Omit<Envelope, "seq">) => {
        seq += 1;
        write(`data: ${JSON.stringify({ ...env, seq })}\n\n`);
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };
      request.signal.addEventListener("abort", close);

      write("retry: 3000\n\n");

      const watchlist = await readWatchlist();
      const t0 = Date.now();
      for (const env of buildAllSnapshots(watchlist, t0, opts)) {
        send(env);
      }

      const lastSent = new Map<string, number>();
      let lastAlertCheck = t0;
      let lastBeat = t0;

      interval = setInterval(() => {
        if (closed) return;
        const now = Date.now();

        for (const ch of DELTA_CHANNELS) {
          // plenário acelera para 1s com votação em andamento
          const cadence =
            ch === "plenario" && isVotacaoAtiva(now, opts) ? 1000 : CHANNEL_CADENCE_MS[ch];
          const last = lastSent.get(ch) ?? t0;
          if (now - last < cadence) continue;
          lastSent.set(ch, now);
          send({ ch, kind: "delta", t: now, data: buildDelta(ch, watchlist, now, opts) });
        }

        for (const alerta of alertsBetween(lastAlertCheck, now, opts)) {
          send({ ch: "alerts", kind: "delta", t: now, data: { alerta } });
          // web push para vermelhos, votações e "falaram de mim" — o id
          // determinístico deduplica entre conexões SSE concorrentes
          if (
            alerta.nivel === "vermelho" ||
            alerta.tipo === "votacao_iniciada" ||
            alerta.tipo === "falaram_de_mim"
          ) {
            void sendPushToAll({
              id: alerta.id,
              titulo: alerta.titulo,
              corpo: alerta.corpo,
              tab: alerta.tab,
            });
          }
        }
        lastAlertCheck = now;

        if (now - lastBeat >= HEARTBEAT_MS) {
          lastBeat = now;
          write(": ping\n\n");
        }
      }, 1000);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // evita buffering de proxy reverso (nginx) — sem isso o SSE "não chega"
      "X-Accel-Buffering": "no",
    },
  });
}
