// /basecalculo — planilha auditável do Índice de Popularidade Digital.
// Mostra, por candidato, CADA número real que entra na conta: valor bruto de
// cada ingrediente, a nota 0–100 (z-score vs. o páreo), o Score ponderado, a
// Reputação (sentimento), a Posição vs. adversários (100 = média) e a Tendência.
// "Não é caixa-preta": dá para conferir se o índice está sendo construído certo.
// Incremental: engajamento/crescimento entram como novas colunas depois.

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
  seguidores: "Seguidores",
};

const TEND = {
  up: { sym: "▲", cor: "#16C784", label: "subindo" },
  flat: { sym: "▬", cor: "#8a93a8", label: "estável" },
  down: { sym: "▼", cor: "#EA3943", label: "caindo" },
} as const;

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString("pt-BR");
}

function fmtValor(ing: Ingrediente, v: number | null): string {
  if (v == null) return "—";
  if (ing === "seguidores") return fmtCompact(v);
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
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now();

  return (
    <main className="log-page">
      <section className="log-hero">
        <div>
          <p className="log-kicker">Base de cálculo · auditoria</p>
          <h1>Índice de Popularidade Digital — a conta, candidato por candidato</h1>
          <p>
            Cada número real que entra no índice: valor bruto, nota 0–100 (vs. a média do páreo),
            Score ponderado, Reputação (sentimento), Posição vs. adversários (100 = média) e
            Tendência. <span style={{ color: "#16C784" }}>●</span> = dado real,{" "}
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
          now={agora}
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
            { t: "Menções", p: "35%", d: "Atenção pública medida pelas visitas diárias ao artigo do candidato na Wikipedia (pageviews). Índice ~100: ritmo recente vs. a média da janela. Open-source, sem chave." },
            { t: "Sentimento", p: "30%", d: "Tom das manchetes reais sobre o candidato, classificado por IA em português (pysentimiento/BERT-PT). Acima de 100 = clima favorável; abaixo = adverso. É a base da Reputação." },
            { t: "Imprensa", p: "15%", d: "Volume de cobertura jornalística (Google News RSS): ritmo de matérias dos últimos dias vs. o normal do candidato. Acima de 100 = em alta na imprensa." },
            { t: "Seguidores", p: "20%", d: "Base real somando as redes (Instagram, TikTok, Facebook, X, YouTube) via BrightData/yt-dlp. Mede o tamanho da audiência própria." },
            { t: "Score", p: "nota composta", d: "0–100 = soma das notas de cada pilar multiplicadas pelos pesos, renormalizada sobre os ingredientes com dado real." },
            { t: "Reputação", p: "= sentimento", d: "É a nota de sentimento (0–100): responde 'falam bem ou mal de nós?'. 50 = na média do páreo." },
            { t: "Posição", p: "100 = média", d: "Score ÷ média dos Scores × 100. Acima de 100 = à frente dos adversários; abaixo = atrás." },
            { t: "Tendência", p: "24h", d: "Compara o Score de agora com o de ~24h atrás: ▲ subindo, ▬ estável, ▼ caindo." },
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
          <code>Score = Σ nota × peso</code> (pesos abaixo, renormalizados sobre os ingredientes com
          dado real). 3) <code>Posição = Score ÷ média(Scores) × 100</code>. Reputação = nota de
          sentimento. Tendência = Score agora vs. ~24h atrás.
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
                <th>Score</th>
                <th>Reputação</th>
                <th>Posição</th>
                <th>Tendência</th>
              </tr>
            </thead>
            <tbody>
              {tabela.linhas.map((l) => {
                const tend = TEND[l.tendencia];
                const posCor = l.posicao == null ? "#8a93a8" : l.posicao >= 100 ? "#16C784" : "#EA3943";
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
                    <td>
                      <strong>{l.score == null ? "—" : l.score.toFixed(1)}</strong>
                    </td>
                    <td style={{ color: "#cfd6e4" }}>
                      {l.reputacao == null ? "—" : Math.round(l.reputacao)}
                    </td>
                    <td>
                      <strong style={{ color: posCor }}>
                        {l.posicao == null ? "—" : Math.round(l.posicao)}
                      </strong>
                    </td>
                    <td style={{ color: tend.cor, whiteSpace: "nowrap" }}>
                      {tend.sym} {tend.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ color: "#5b6478", fontSize: 11.5, marginTop: 12 }}>
          Fontes reais (open-source): imprensa = Google News, sentimento = pysentimiento (BERT-PT)
          nas manchetes, <strong>menções = visitas ao artigo na Wikipedia</strong> (pageviews),
          seguidores = BrightData/YouTube. Incremental: <strong>engajamento</strong> e{" "}
          <strong>crescimento</strong> entram como novas colunas/pesos quando a coleta estiver pronta.
        </p>
      </section>
    </main>
  );
}
