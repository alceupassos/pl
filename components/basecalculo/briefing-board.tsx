"use client";

// BRIEFING colaborativo no rodapé do /basecalculo. Qualquer um que entra pode
// escrever um pedido/dúvida de mudança; enquanto digita, um painel flutuante
// "lê em tempo real" e adianta o que precisa ser feito (debounce ~1s + efeito de
// digitação). Os briefings enviados ficam listados ali, visíveis para todos, e
// qualquer um pode apagar. Persistência em data/briefings.jsonl.

import { Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Briefing = {
  id: string;
  at: string;
  city: string;
  region: string;
  message: string;
  ia?: string;
};

const IA_FALLBACK =
  "Não consegui ler agora, mas seu briefing será salvo. Tente descrever o que mudar (onde, qual número/seção e o resultado esperado).";

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function BriefingBoard() {
  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState<Briefing[]>([]);
  const [sending, setSending] = useState(false);

  // leitura ao vivo
  const [dismissed, setDismissed] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaFull, setIaFull] = useState("");
  const [iaShown, setIaShown] = useState("");
  const iaFullRef = useRef("");

  // modal derivado do texto (evita setState síncrono em efeito)
  const modalOpen = !dismissed && texto.trim().length >= 10;

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/briefing", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { ok?: boolean; briefings?: Briefing[] };
      if (json.ok && Array.isArray(json.briefings)) setLista(json.briefings);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/briefing", { credentials: "include", cache: "no-store" });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { ok?: boolean; briefings?: Briefing[] };
        if (alive && json.ok && Array.isArray(json.briefings)) setLista(json.briefings);
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // debounce ~1s: a cada pausa na digitação, relê o briefing pela IA
  useEffect(() => {
    const q = texto.trim();
    if (q.length < 10) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setIaLoading(true);
      try {
        const res = await fetch("/api/ai/briefing", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: q }),
          signal: ctrl.signal,
        });
        const json = (await res.json()) as { ok?: boolean; reply?: string };
        const reply = json.ok && json.reply?.trim() ? json.reply.trim() : IA_FALLBACK;
        iaFullRef.current = reply;
        setIaFull(reply);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          iaFullRef.current = IA_FALLBACK;
          setIaFull(IA_FALLBACK);
        }
      } finally {
        setIaLoading(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [texto]);

  // efeito de digitação sobre a resposta da IA (a 1ª batida do interval já
  // reinicia a partir do começo, sem setState síncrono dentro do efeito)
  useEffect(() => {
    if (!iaFull) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setIaShown(iaFull.slice(0, i));
      if (i >= iaFull.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [iaFull]);

  const enviar = useCallback(async () => {
    const message = texto.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, ia: iaFullRef.current || undefined }),
      });
      if (res.ok) {
        setTexto("");
        setDismissed(false);
        setIaFull("");
        iaFullRef.current = "";
        await carregar();
      }
    } catch {
      /* silencioso */
    } finally {
      setSending(false);
    }
  }, [texto, sending, carregar]);

  const apagar = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/briefing", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        await carregar();
      } catch {
        /* silencioso */
      }
    },
    [carregar],
  );

  return (
    <section
      className="log-panel"
      style={{
        border: "1px solid rgba(245,166,35,0.45)",
        background: "linear-gradient(180deg, rgba(245,166,35,0.07), rgba(255,255,255,0))",
        boxShadow: "0 0 40px rgba(245,166,35,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.14em",
            color: "#0c0d12",
            background: "#F5A623",
            borderRadius: 6,
            padding: "3px 8px",
          }}
        >
          BRIEFING
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8ecf4", margin: 0 }}>
          Peça mudanças ou tire dúvidas
        </h2>
      </div>
      <p style={{ color: "#c8b48a", fontSize: 13, lineHeight: 1.55, margin: "0 0 14px" }}>
        Qualquer pessoa pode escrever aqui. Enquanto você digita, a IA já adianta o que
        precisa ser feito. O recado fica salvo e visível abaixo — e pode ser apagado por
        qualquer um.
      </p>

      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          if (dismissed) setDismissed(false);
        }}
        rows={5}
        placeholder="Ex.: No card do /m, deixar o crescimento com seta de tendência. Ou: trocar o peso da imprensa para 25%."
        aria-label="Briefing de mudança"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 12,
          padding: "12px 14px",
          color: "#e8ecf4",
          fontSize: 15,
          lineHeight: 1.5,
          outline: "none",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={sending || !texto.trim()}
          style={{
            background: "#F5A623",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            color: "#0c0d12",
            fontSize: 14,
            fontWeight: 800,
            cursor: sending || !texto.trim() ? "default" : "pointer",
            opacity: sending || !texto.trim() ? 0.5 : 1,
          }}
        >
          {sending ? "Enviando…" : "Enviar briefing"}
        </button>
        <span style={{ color: "#7a8198", fontSize: 12 }}>
          {lista.length} {lista.length === 1 ? "briefing enviado" : "briefings enviados"}
        </span>
      </div>

      {/* lista visível para todos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {lista.length === 0 ? (
          <p style={{ color: "#7a8198", fontSize: 13, margin: 0 }}>
            Nenhum briefing ainda — seja o primeiro.
          </p>
        ) : (
          lista.map((b) => (
            <div
              key={b.id}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: "#7a8198", fontSize: 11 }}>
                  {formatDate(b.at)}
                  {b.city && b.city !== "Local/privado" ? ` · ${b.city}/${b.region}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void apagar(b.id)}
                  aria-label="Apagar briefing"
                  title="Apagar"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(234,57,67,0.35)",
                    borderRadius: 8,
                    padding: "3px 8px",
                    color: "#EA3943",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                  }}
                >
                  <Trash2 size={12} /> apagar
                </button>
              </div>
              <p style={{ color: "#e8ecf4", fontSize: 14, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                {b.message}
              </p>
              {b.ia ? (
                <details style={{ marginTop: 8 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: "#c4b5fd",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      listStyle: "none",
                    }}
                  >
                    ✨ leitura da IA — o que precisa ser feito
                  </summary>
                  <p
                    style={{
                      color: "#cfc2f0",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      margin: "6px 0 0",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {b.ia}
                  </p>
                </details>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* modal flutuante — leitura ao vivo */}
      {modalOpen ? (
        <div
          role="dialog"
          aria-label="Leitura ao vivo do briefing"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            width: "min(360px, calc(100vw - 32px))",
            zIndex: 60,
            background: "rgba(16,16,24,0.97)",
            border: "1px solid rgba(168,85,247,0.45)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Sparkles size={15} strokeWidth={2.2} color="#c4b5fd" aria-hidden />
            <strong style={{ color: "#e8e0ff", fontSize: 12.5, letterSpacing: "0.04em", flex: 1 }}>
              Lendo em tempo real{iaLoading ? "…" : ""}
            </strong>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Fechar"
              style={{ background: "transparent", border: "none", color: "#9aa3b8", cursor: "pointer", display: "flex" }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.06em", color: "#c4b5fd", marginBottom: 4 }}>
            O QUE PRECISA SER FEITO
          </div>
          <p style={{ color: "#e8e0ff", fontSize: 13, lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap", minHeight: 40 }}>
            {iaShown || (iaLoading ? "lendo seu briefing…" : "continue escrevendo…")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
