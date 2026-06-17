// Export .xls dos números que geram TODOS os índices do /basecalculo.
// Mesma fonte única (computeIndexTable) que a página e os cards. Gera SpreadsheetML
// 2003 (XML) com Content-Type application/vnd.ms-excel — o Excel/LibreOffice abrem
// nativamente como .xls, sem dependência nova. 3 planilhas:
//   1) Índice por candidato (valor + nota de cada pilar, pesos, IRE/PRA/TIRE/seg7d)
//   2) Pesos & fórmula (metodologia)
//   3) Histórico do índice (série temporal do score por candidato)

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { computeIndexTable, type Ingrediente } from "@/lib/index-real";
import { readScoreSeries } from "@/lib/sources/index-history";
import { readWatchlist } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LABEL: Record<Ingrediente, string> = {
  sentimento: "Sentimento",
  mencoes: "Menções",
  imprensa: "Imprensa",
  seguidores: "Crescimento Δ7d",
};

// ordem de exibição = ordem dos pesos
const ORDEM: Ingrediente[] = ["sentimento", "mencoes", "imprensa", "seguidores"];

function xmlEscape(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function strCell(v: string): string {
  return `<Cell><Data ss:Type="String">${xmlEscape(v)}</Data></Cell>`;
}

function numCell(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return strCell("");
  return `<Cell><Data ss:Type="Number">${n}</Data></Cell>`;
}

function row(cells: string[]): string {
  return `<Row>${cells.join("")}</Row>`;
}

function sheet(name: string, rows: string[]): string {
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rows.join("")}</Table></Worksheet>`;
}

function fmtDataHora(ms: number): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(ms));
  } catch {
    return String(ms);
  }
}

export async function GET(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const watchlist = await readWatchlist();
  const tabela = computeIndexTable(watchlist, Date.now());
  const series = readScoreSeries();

  // ── Planilha 1: Índice por candidato ──
  const cab1 = ["Símbolo", "Nome", "Você?"];
  for (const ing of ORDEM) {
    cab1.push(`${LABEL[ing]} (valor)`, `${LABEL[ing]} (nota 0–100)`, `${LABEL[ing]} (fonte)`);
  }
  cab1.push("IRE", "PRA (%)", "TIRE Δ7d", "TIRE", "Seguidores 7d (%)", "Score");

  const rows1: string[] = [row(cab1.map(strCell))];
  for (const l of tabela.linhas) {
    const cells = [strCell(l.simbolo), strCell(l.nome), strCell(l.voce ? "sim" : "não")];
    for (const ing of ORDEM) {
      const cel = l.ingredientes[ing];
      cells.push(numCell(cel.valor), numCell(cel.nota), strCell(cel.fonte));
    }
    cells.push(
      numCell(l.reputacao),
      numCell(l.posicao),
      numCell(l.tendenciaDelta),
      strCell(l.tendencia),
      numCell(l.seguidores7dPct),
      numCell(l.score),
    );
    rows1.push(row(cells));
  }
  rows1.push(row([strCell("Média do páreo (Score/IRE)"), strCell(""), strCell("")]
    .concat(ORDEM.flatMap(() => [strCell(""), strCell(""), strCell("")]))
    .concat([numCell(tabela.mediaScore), strCell(""), numCell(tabela.tendenciaAdversariosDelta), strCell(`TPRA ${tabela.tendenciaAdversarios}`), strCell(""), numCell(tabela.mediaScore)])));

  // ── Planilha 2: Pesos & fórmula ──
  const rows2: string[] = [
    row([strCell("Pilar"), strCell("Peso (%)")]),
    ...ORDEM.map((ing) => row([strCell(LABEL[ing]), numCell(Math.round((tabela.pesos[ing] ?? 0) * 100))])),
    row([strCell(""), strCell("")]),
    row([strCell("Metodologia"), strCell("")]),
    row([strCell("Nota de cada pilar"), strCell("50 + 20 × (valor − média) ÷ desvio (0–100; 50 = na média do páreo)")]),
    row([strCell("IRE"), strCell("Σ (nota × peso), renormalizado sobre os pilares com dado real")]),
    row([strCell("PRA"), strCell("(IRE ÷ média × 100) − 100, em % (0 = média; positivo = à frente)")]),
    row([strCell("TIRE"), strCell("variação do IRE do candidato nos últimos 7 dias (ΔIRE 7d)")]),
    row([strCell("TPRA"), strCell("média do ΔIRE 7d dos concorrentes")]),
    row([strCell("Crescimento Δ7d"), strCell("variação % da base de seguidores nos últimos 7 dias")]),
    row([strCell(""), strCell("")]),
    row([strCell("Gerado em"), strCell(fmtDataHora(tabela.at))]),
  ];

  // ── Planilha 3: Histórico do índice (score por candidato, formato longo) ──
  const rows3: string[] = [row([strCell("Símbolo"), strCell("Data/hora"), strCell("Score")])];
  for (const l of tabela.linhas) {
    const pts = series[l.simbolo] ?? [];
    for (const p of pts) {
      rows3.push(row([strCell(l.simbolo), strCell(fmtDataHora(p.t)), numCell(p.v)]));
    }
  }
  if (rows3.length === 1) rows3.push(row([strCell("(sem histórico ainda)"), strCell(""), strCell("")]));

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?mso-application progid="Excel.Sheet"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:x="urn:schemas-microsoft-com:office:excel" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    sheet("Índice por candidato", rows1) +
    sheet("Pesos & fórmula", rows2) +
    sheet("Histórico (score)", rows3) +
    `</Workbook>`;

  const stamp = new Date(tabela.at).toISOString().slice(0, 10);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="base-calculo-indices-${stamp}.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
