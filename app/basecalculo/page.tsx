// /basecalculo — planilha auditável do Índice de Popularidade Digital.
// Mostra, por candidato, CADA número real que entra na conta: valor bruto de
// cada ingrediente, a nota 0–100 (z-score vs. o páreo), o IRE (Índice de
// Reputação Eleitoral = nota composta ponderada: Sentimento 40% · Menções 25% ·
// Imprensa 20% · Crescimento 15%), a PRA (Posição Relativa Adversários, em %) e o
// TIRE (tendência do IRE em 7 dias).
// "Não é caixa-preta": dá para conferir se o índice está sendo construído certo.

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { appendAccessLog } from "@/lib/access-log";
import { getAuthCookieName, verifySession } from "@/lib/auth";
import {
  INGREDIENTES,
  computeIndexTable,
  type Celula,
  type Ingrediente,
} from "@/lib/index-real";
import { PerguntasIA } from "@/components/basecalculo/perguntas-ia";
import { Showcase3D } from "@/components/basecalculo/showcase-3d";
import { readScoreSeries } from "@/lib/sources/index-history";
import { warmIndexSources } from "@/lib/warm-index";
import { readWatchlist } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LABEL: Record<Ingrediente, string> = {
  mencoes: "Menções",
  sentimento: "Sentimento",
  imprensa: "Imprensa",
  seguidores: "Crescimento",
};

const TEND = {
  up: { sym: "▲", cor: "#16C784", label: "subindo" },
  flat: { sym: "▬", cor: "#8a93a8", label: "estável" },
  down: { sym: "▼", cor: "#EA3943", label: "caindo" },
} as const;

function fmtSigned(v: number, suffix = ""): string {
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${Math.abs(v).toFixed(1).replace(".", ",")}${suffix}`;
}

function fmtValor(ing: Ingrediente, v: number | null): string {
  if (v == null) return "—";
  // O pilar "seguidores" entra no índice como crescimento % de 7 dias.
  if (ing === "seguidores") return fmtSigned(v, "%");
  return v.toFixed(1);
}

function CelulaCell({ ing, cel }: { ing: Ingrediente; cel: Celula }) {
  const real = cel.fonte === "real";
  return (
    <td style={{ opacity: real ? 1 : 0.5, whiteSpace: "nowrap" }}>
      <span style={{ color: real ? "#16C784" : "#F5A623", marginRight: 6 }}>{real ? "●" : "○"}</span>
      <strong style={{ fontVariantNumeric: "tabular-nums" }}>
        {cel.nota == null ? "—" : Math.round(cel.nota)}
      </strong>
      <span style={{ color: "#8a93a8", fontSize: "0.82em" }}> ({fmtValor(ing, cel.valor)})</span>
    </td>
  );
}

export default async function BaseCalculoPage() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const session = verifySession(token, requestHeaders);
  if (!session) redirect("/");

  await appendAccessLog(requestHeaders, {
    event: "basecalculo_page_view",
    path: "/basecalculo",
  });

  const watchlist = await readWatchlist();
  // Abrir a auditoria também aquece as fontes reais (não-bloqueante).
  warmIndexSources(watchlist);
  // Server Component (não é hook): a leitura do relógio é intencional.
  // eslint-disable-next-line react-hooks/purity
  const tabela = computeIndexTable(watchlist, Date.now());
  const series = readScoreSeries();

  return (
    <main className="log-page">
      <section className="log-hero">
        <div>
          <p className="log-kicker">Base de cálculo · auditoria</p>
          <h1>Índice de Popularidade Digital — a conta, candidato por candidato</h1>
          <p>
            Cada número real que entra no índice: valor bruto, nota 0–100 (vs. a média do páreo),{" "}
            <strong>IRE</strong> (Índice de Reputação Eleitoral = nota composta ponderada:
            Sentimento 40% · Menções 25% · Imprensa 20% · Crescimento 15%),{" "}
            <strong>PRA</strong> (Posição Relativa Adversários, em %; 0 = média do páreo) e{" "}
            <strong>TIRE</strong> (tendência do IRE nos últimos 7 dias).{" "}
            <span style={{ color: "#16C784" }}>●</span> = dado real,{" "}
            <span style={{ color: "#F5A623" }}>○</span> = sem fonte real ainda.
          </p>
        </div>
        <div className="log-stat-grid">
          <div className="log-stat">
            <span>Candidatos</span>
            <strong>{tabela.linhas.length}</strong>
          </div>
          <div className="log-stat">
            <span>Média do páreo (Score)</span>
            <strong>{tabela.mediaScore == null ? "—" : tabela.mediaScore.toFixed(1)}</strong>
          </div>
        </div>
      </section>

      <section className="log-panel">
        <Showcase3D
          linhas={tabela.linhas}
          pesos={tabela.pesos}
          mediaScore={tabela.mediaScore}
          series={series}
          tendenciaAdversarios={tabela.tendenciaAdversarios}
          tendenciaAdversariosDelta={tabela.tendenciaAdversariosDelta}
          tendenciaAdversariosProvisoria={tabela.tendenciaAdversariosProvisoria}
        />
      </section>

      <section className="log-panel">
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8ecf4", margin: "0 0 10px" }}>
          Descritivo de cada dado
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { t: "Sentimento", p: "40%", d: "Tom das manchetes reais sobre o candidato, classificado por IA em português (pysentimiento/BERT-PT). Acima de 100 = clima favorável; abaixo = adverso. É o maior peso do IRE." },
            { t: "Menções", p: "25%", d: "Atenção pública medida pelas visitas diárias ao artigo do candidato na Wikipedia (pageviews). Índice ~100: ritmo recente vs. a média da janela. Open-source, sem chave." },
            { t: "Imprensa", p: "20%", d: "Volume de cobertura jornalística (Google News RSS): ritmo de matérias dos últimos dias vs. o normal do candidato. Acima de 100 = em alta na imprensa." },
            { t: "Crescimento da base", p: "15% · Δ7d", d: "Variação % dos seguidores nos últimos 7 dias (base somada das redes — Instagram, TikTok, Facebook, X, YouTube — via BrightData/yt-dlp). Mede se a audiência própria está crescendo. Enquanto não há 7 dias de histórico, fica 'acumulando' e o índice roda sobre os demais pilares." },
            { t: "IRE", p: "= índice composto", d: "Índice de Reputação Eleitoral: a nota composta 0–100 = soma das notas de cada pilar × pesos (40/25/20/15), renormalizada sobre os ingredientes com dado real. Responde 'como anda a reputação digital?'. 50 = na média do páreo." },
            { t: "TIRE", p: "tendência · 7d", d: "Tendência do IRE: variação do IRE do candidato nos últimos 7 dias (▲ subindo, ▬ estável, ▼ caindo)." },
            { t: "PRA", p: "% · 0 = média", d: "Posição Relativa Adversários = 100 − (IRE ÷ média × 100), em %. 0 = na média do páreo; negativo = à frente dos adversários; positivo = atrás." },
            { t: "TPRA", p: "tendência · 7d", d: "Tendência do PRA: média das tendências (ΔIRE em 7 dias) dos concorrentes RJ — para onde o páreo adversário caminha." },
          ].map((item) => (
            <div
              key={item.t}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <strong style={{ color: "#e8ecf4", fontSize: 14 }}>{item.t}</strong>
                <span style={{ color: "#7fb0ff", fontSize: 11, fontWeight: 700 }}>{item.p}</span>
              </div>
              <p style={{ color: "#9aa3b8", fontSize: 12, lineHeight: 1.55, margin: "6px 0 0" }}>{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="log-panel">
        <p style={{ color: "#8a93a8", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
          <strong style={{ color: "#cfd6e4" }}>Como a conta é feita:</strong> 1) cada ingrediente
          vira nota <code>50 + 15 × (valor − média) ÷ desvio</code> (0–100, 50 = na média). 2){" "}
          <code>IRE = Σ nota × peso</code> (Sentimento 40% · Menções 25% · Imprensa 20% ·
          Crescimento 15%, renormalizados sobre os ingredientes com dado real). 3){" "}
          <code>PRA = 100 − (IRE ÷ média × 100)</code>, em % (0 = na média do páreo).
          TIRE = ΔIRE do candidato em 7 dias; TPRA = média do ΔIRE 7 dias dos concorrentes.
        </p>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Candidato</th>
                {INGREDIENTES.map((ing) => (
                  <th key={ing} style={{ whiteSpace: "nowrap" }}>
                    {LABEL[ing]}{" "}
                    <span style={{ color: "#8a93a8", fontWeight: 400 }}>
                      {Math.round(tabela.pesos[ing] * 100)}%
                    </span>
                  </th>
                ))}
                <th>IRE</th>
                <th style={{ whiteSpace: "nowrap" }}>PRA (%)</th>
                <th style={{ whiteSpace: "nowrap" }}>TIRE (7d)</th>
              </tr>
            </thead>
            <tbody>
              {tabela.linhas.map((l) => {
                const tend = TEND[l.tendencia];
                // PRA = 100 − Score÷média×100: negativo = à frente (verde); positivo = atrás (vermelho).
                const posCor =
                  l.posicao == null ? "#8a93a8" : l.posicao < -0.05 ? "#16C784" : l.posicao > 0.05 ? "#EA3943" : "#8a93a8";
                return (
                  <tr key={l.simbolo}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <strong style={{ color: l.cor }}>{l.simbolo}</strong>
                      {l.voce ? <span style={{ color: "#16C784", fontSize: "0.8em" }}> · você</span> : null}
                      <div style={{ color: "#8a93a8", fontSize: "0.82em" }}>{l.nome}</div>
                    </td>
                    {INGREDIENTES.map((ing) => (
                      <CelulaCell key={ing} ing={ing} cel={l.ingredientes[ing]} />
                    ))}
                    <td style={{ color: "#cfd6e4" }}>
                      <strong>{l.reputacao == null ? "—" : Math.round(l.reputacao)}</strong>
                    </td>
                    <td>
                      <strong style={{ color: posCor }}>
                        {l.posicao == null ? "—" : fmtSigned(l.posicao, "%")}
                      </strong>
                    </td>
                    <td style={{ color: tend.cor, whiteSpace: "nowrap" }}>
                      {tend.sym} {tend.label}
                      {l.tendenciaDelta != null ? (
                        <span style={{ color: "#8a93a8", fontWeight: 400 }}> {fmtSigned(l.tendenciaDelta)}</span>
                      ) : null}
                      {l.tendenciaProvisoria ? (
                        <span style={{ color: "#5b6478", fontSize: "0.8em" }}> · acumulando</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ color: "#5b6478", fontSize: 11.5, marginTop: 12 }}>
          Fontes reais (open-source): imprensa = Google News, sentimento = pysentimiento (BERT-PT)
          nas manchetes, <strong>menções = visitas ao artigo na Wikipedia</strong> (pageviews),{" "}
          <strong>crescimento = Δ7d da base de seguidores</strong> (BrightData/YouTube). Incremental:{" "}
          <strong>engajamento</strong> entra como nova coluna/peso quando a coleta estiver pronta.
        </p>
      </section>

      <PerguntasIA />
    </main>
  );
}
