"use client";

// Rodapé do /basecalculo: FAQ fixo explicando os índices + um input de IA para
// perguntas livres sobre o projeto (ex.: "O que é Reputação?"). O FAQ é texto
// curado (sempre visível); a IA responde via /api/ai/projeto (curto, direto e
// gentil). Em erro/indisponibilidade, cai num fallback sem quebrar a UI.

import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

const FAQ: { q: string; a: string }[] = [
  {
    q: "O que é Reputação (IRE)?",
    a: "É o Índice de Reputação Eleitoral: uma nota de 0 a 100 que resume a reputação digital do candidato. 50 = na média do páreo; acima disso, melhor que os adversários.",
  },
  {
    q: "Como o IRE é calculado?",
    a: "IRE = Sentimento 40% + Menções 25% + Imprensa 20% + Crescimento da base 15%. Cada pilar vira uma nota 0–100 e o IRE é a soma ponderada, renormalizada sobre os pilares com dado real.",
  },
  {
    q: "O que é Sentimento? (40%)",
    a: "É o tom das manchetes reais sobre o candidato, classificado por IA em português (pysentimiento/BERT-PT). Acima de 100 = clima favorável; abaixo = adverso. É o maior peso do IRE.",
  },
  {
    q: "O que são Menções? (25%)",
    a: "É a atenção pública medida pelas visitas diárias ao artigo do candidato na Wikipedia (pageviews) — quanto o público busca por ele. Fonte open-source, sem chave.",
  },
  {
    q: "O que é Imprensa? (20%)",
    a: "É o volume de cobertura jornalística (Google News): o ritmo de matérias dos últimos dias vs. o normal do candidato. Acima de 100 = em alta na imprensa.",
  },
  {
    q: "O que é Crescimento da base? (15%)",
    a: "É a variação % dos seguidores somados das redes (Instagram, TikTok, Facebook, X, YouTube) nos últimos 7 dias. Mede se a audiência própria está crescendo. Sem 7 dias de histórico, fica 'acumulando'.",
  },
  {
    q: "O que é PRA?",
    a: "Posição Relativa Adversários = (IRE ÷ média × 100) − 100, em %. 0 = na média do páreo; positivo = à frente dos adversários; negativo = atrás.",
  },
  {
    q: "O que é TIRE?",
    a: "É a tendência do IRE: quanto o índice do candidato variou nos últimos 7 dias (▲ subindo, ▬ estável, ▼ caindo).",
  },
  {
    q: "O que é TPRA?",
    a: "É a tendência do páreo adversário: a média da variação do IRE (ΔIRE em 7 dias) dos concorrentes do RJ — para onde o conjunto dos adversários caminha.",
  },
  {
    q: "O que significa a nota 0–100 (z-score)?",
    a: "Cada pilar vira nota 50 + 20 × (valor − média) ÷ desvio, comparando o candidato com a média do páreo. 50 = exatamente na média; quanto maior, mais acima dos concorrentes.",
  },
];

const FALLBACK =
  "Não consegui consultar a IA agora. Enquanto isso: o IRE é a reputação digital (0–100) = Sentimento 40% + Menções 25% + Imprensa 20% + Crescimento 15%. Veja também o FAQ acima.";

export function PerguntasIA() {
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const perguntar = useCallback(async () => {
    const q = pergunta.trim();
    if (!q || loading) return;
    setLoading(true);
    setResposta(null);
    try {
      const res = await fetch("/api/ai/projeto", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: q }),
      });
      if (!res.ok) throw new Error("http");
      const json = (await res.json()) as { ok?: boolean; reply?: string };
      setResposta(json.ok && json.reply?.trim() ? json.reply.trim() : FALLBACK);
    } catch {
      setResposta(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, [pergunta, loading]);

  return (
    <section className="log-panel">
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8ecf4", margin: "0 0 4px" }}>
        Perguntas sobre os índices
      </h2>
      <p style={{ color: "#9aa3b8", fontSize: 13, lineHeight: 1.55, margin: "0 0 14px" }}>
        Tire dúvidas sobre como a conta é feita. Abaixo, as perguntas mais comuns já
        respondidas — ou pergunte o que quiser para a IA.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {FAQ.map((item) => (
          <details
            key={item.q}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                color: "#cfd6e4",
                fontSize: 13.5,
                fontWeight: 700,
                listStyle: "none",
              }}
            >
              {item.q}
            </summary>
            <p style={{ color: "#9aa3b8", fontSize: 12.5, lineHeight: 1.55, margin: "8px 0 0" }}>
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingTop: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#c4b5fd",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          <Sparkles size={14} strokeWidth={2.2} aria-hidden /> PERGUNTE À IA
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perguntar();
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input
            type="text"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex.: O que é Reputação?"
            aria-label="Pergunta sobre o projeto"
            style={{
              flex: "1 1 260px",
              minWidth: 0,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#e8ecf4",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !pergunta.trim()}
            style={{
              background: "rgba(168,85,247,0.18)",
              border: "1px solid rgba(168,85,247,0.45)",
              borderRadius: 10,
              padding: "10px 18px",
              color: "#e8e0ff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: loading || !pergunta.trim() ? "default" : "pointer",
              opacity: loading || !pergunta.trim() ? 0.55 : 1,
            }}
          >
            {loading ? "Consultando…" : "Perguntar"}
          </button>
        </form>

        {resposta ? (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(168,85,247,0.10)",
              border: "1px solid rgba(168,85,247,0.30)",
            }}
          >
            <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: "#e8e0ff" }}>
              {resposta}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
