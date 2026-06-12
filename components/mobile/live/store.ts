// LiveStore — estado vivo do /m fora do React.
// Cada componente assina só o(s) canal(is) que mostra via useSyncExternalStore;
// um tick de 2s no índice não re-renderiza o resto do app.

import {
  CHANNEL_SCHEMAS,
  EnvelopeSchema,
  type Alert,
  type AlertsDelta,
  type AlertsSnapshot,
  type Channel,
  type EcgDelta,
  type EcgSnapshot,
  type EquipeDelta,
  type EquipeSnapshot,
  type IdxDelta,
  type IdxSnapshot,
  type PesquisasDelta,
  type PesquisasSnapshot,
  type QuotesNacDelta,
  type QuotesNacSnapshot,
  type QuotesRjDelta,
  type QuotesRjSnapshot,
  type RedesV2Delta,
  type RedesV2Snapshot,
  type TapeDelta,
  type TapeSnapshot,
  type VozDelta,
  type VozSnapshot,
} from "@/lib/live-schemas";

export type ChannelState<T = unknown> = {
  data: T | null;
  /** epoch ms do último envelope aceito. */
  lastAt: number;
};

export type LiveStatus = "connecting" | "open" | "stale";

type Key = Channel | "@status";

const EMPTY: ChannelState = { data: null, lastAt: 0 };

const ECG_H1_CAP = 720;
const TAPE_CAP = 12;
const SPARK_RJ_CAP = 14;
const SPARK_NAC_CAP = 24;
const ALERTS_CAP = 50;

export class LiveStore {
  private channels = new Map<Channel, ChannelState>();
  private listeners = new Map<Key, Set<() => void>>();
  private pending = new Set<Key>();
  private rafId = 0;
  private statusValue: LiveStatus = "connecting";

  subscribe(key: Key, listener: () => void): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => set?.delete(listener);
  }

  getChannel(ch: Channel): ChannelState {
    return this.channels.get(ch) ?? EMPTY;
  }

  getStatus(): LiveStatus {
    return this.statusValue;
  }

  setStatus(status: LiveStatus) {
    if (this.statusValue === status) return;
    this.statusValue = status;
    this.markDirty("@status");
  }

  /** Aplica um envelope cru vindo do SSE (valida com zod; inválido = descarta). */
  apply(raw: unknown) {
    const env = EnvelopeSchema.safeParse(raw);
    if (!env.success) {
      console.warn("[live] envelope inválido descartado", env.error.message);
      return;
    }
    const { ch, kind, t, data } = env.data;
    const schema = CHANNEL_SCHEMAS[ch][kind];
    const payload = schema.safeParse(data);
    if (!payload.success) {
      console.warn(`[live] payload inválido em ${ch}/${kind}`, payload.error.message);
      return;
    }

    const prev = this.channels.get(ch)?.data ?? null;
    const next = kind === "snapshot" ? payload.data : reduceDelta(ch, prev, payload.data);
    if (next === undefined) return;
    this.channels.set(ch, { data: next, lastAt: t });
    this.markDirty(ch);
  }

  private markDirty(key: Key) {
    this.pending.add(key);
    if (typeof window === "undefined") {
      this.flush();
      return;
    }
    if (this.rafId) return;
    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = 0;
      this.flush();
    });
  }

  private flush() {
    const keys = [...this.pending];
    this.pending.clear();
    for (const key of keys) {
      this.listeners.get(key)?.forEach((listener) => listener());
    }
  }
}

/* ── reducers por canal (delta → estado novo, identidade nova) ── */

function reduceDelta(ch: Channel, prev: unknown, delta: unknown): unknown {
  switch (ch) {
    case "idx.sost": {
      const d = delta as IdxDelta;
      const p = prev as IdxSnapshot | null;
      if (!p) return undefined; // delta antes do snapshot — ignora
      return { ...p, ...d };
    }
    case "sent.ecg": {
      const d = delta as EcgDelta;
      const p = prev as EcgSnapshot | null;
      if (!p) return undefined;
      return {
        ...p,
        mencoesMin: d.mencoesMin,
        h1: {
          pos: [...p.h1.pos.slice(-ECG_H1_CAP + 1), d.pos],
          neg: [...p.h1.neg.slice(-ECG_H1_CAP + 1), d.neg],
        },
      };
    }
    case "ticker.tape": {
      const d = delta as TapeDelta;
      const p = prev as TapeSnapshot | null;
      if (!p) return undefined;
      const lista = p[d.trilha];
      if (lista.some((m) => m.id === d.manchete.id)) return p;
      return { ...p, [d.trilha]: [...lista.slice(-TAPE_CAP + 1), d.manchete] };
    }
    case "quotes.rj": {
      const d = delta as QuotesRjDelta;
      const p = prev as QuotesRjSnapshot | null;
      if (!p) return undefined;
      const bySimbolo = new Map(d.quotes.map((q) => [q.simbolo, q]));
      return {
        quotes: p.quotes.map((q) => {
          const upd = bySimbolo.get(q.simbolo);
          if (!upd) return q;
          return {
            ...q,
            valor: upd.valor,
            variacao24h: upd.variacao24h,
            candleVivo: upd.candleVivo,
            sparkSeguidores: [...q.sparkSeguidores.slice(-SPARK_RJ_CAP + 1), upd.sparkLast],
          };
        }),
      };
    }
    case "quotes.nac": {
      const d = delta as QuotesNacDelta;
      const p = prev as QuotesNacSnapshot | null;
      if (!p) return undefined;
      const byId = new Map(d.atores.map((a) => [a.id, a]));
      return {
        ...p, // preserva `fonte` (pesquisa real) e demais campos do snapshot
        atores: p.atores.map((a) => {
          const upd = byId.get(a.id);
          if (!upd) return a;
          return {
            ...a, // preserva `pct` (intenção real) entre deltas
            score: upd.score,
            dir: upd.dir,
            spark: [...a.spark.slice(-SPARK_NAC_CAP + 1), upd.sparkLast],
          };
        }),
      };
    }
    case "alerts": {
      const d = delta as AlertsDelta;
      const p = (prev as AlertsSnapshot | null) ?? { alertas: [] as Alert[] };
      if (p.alertas.some((a) => a.id === d.alerta.id)) return p;
      return { alertas: [d.alerta, ...p.alertas].slice(0, ALERTS_CAP) };
    }
    case "redes": {
      // merge: históricos 30d/heatmap só viajam no snapshot
      const d = delta as RedesV2Delta;
      const p = prev as RedesV2Snapshot | null;
      if (!p) return undefined;
      const vivoPorRede = new Map(d.porRedeVivo.map((r) => [r.rede, r]));
      return {
        ...p,
        plataformas: d.plataformas,
        ultimoPost: d.ultimoPost,
        racingSemanal: d.racingSemanal,
        crise: d.crise,
        veiculos: d.veiculos,
        porRede: p.porRede.map((r) => {
          const vivo = vivoPorRede.get(r.rede);
          if (!vivo) return r;
          return {
            ...r,
            seguidoresAgora: vivo.seguidoresAgora,
            engajamentoAgora: vivo.engajamentoAgora,
            concorrentes: vivo.concorrentes,
          };
        }),
      };
    }
    case "equipe": {
      const d = delta as EquipeDelta;
      const p = prev as EquipeSnapshot | null;
      if (!p) return undefined;
      const vivo = new Map(d.porRegiao.map((r) => [r.id, r]));
      const idsNovos = new Set(p.feed.map((f) => f.id));
      const novos = d.feedNovos.filter((f) => !idsNovos.has(f.id));
      return {
        ...p,
        geral: d.geral,
        funil: d.funil,
        porRegiao: p.porRegiao.map((r) => {
          const u = vivo.get(r.id);
          if (!u) return r;
          return {
            ...r,
            cadastrados: u.cadastrados,
            pct: u.pct,
            spark: [...r.spark.slice(-19), u.sparkLast],
          };
        }),
        feed: [...novos, ...p.feed].slice(0, 30),
      };
    }
    case "pesquisas": {
      const d = delta as PesquisasDelta;
      const p = prev as PesquisasSnapshot | null;
      if (!p) return undefined;
      return { ...p, propria: d.propria };
    }
    case "voz": {
      const d = delta as VozDelta;
      const p = prev as VozSnapshot | null;
      if (!p) return undefined;
      const ids = new Set(p.mensagens.map((m) => m.id));
      const novas = d.mensagens.filter((m) => !ids.has(m.id));
      return {
        contadores: d.contadores,
        mensagens: [...novas, ...p.mensagens].slice(0, 60),
      };
    }
    // canais de estado completo: o delta JÁ É o estado novo
    default:
      return delta;
  }
}
