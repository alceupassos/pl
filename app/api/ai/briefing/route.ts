import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { aiChat } from "@/lib/ai/client";

const noStore = { "Cache-Control": "no-store" };

// Leitura ao vivo do briefing: dado um pedido/dúvida de mudança no cockpit,
// responde O QUE PRECISA SER FEITO em passos curtos. Tom curto, direto e gentil.
const SYSTEM = `Você é o assistente técnico do cockpit eleitoral (painel da campanha de Sóstenes Cavalcante, PL-RJ).
Você recebe um BRIEFING — um pedido ou dúvida de mudança no painel — e responde O QUE PRECISA SER FEITO, em até 4 itens curtos (passos objetivos e acionáveis). Tom CURTO, DIRETO e sempre GENTIL. Se o pedido estiver vago, peça com gentileza o detalhe que falta (1 frase). Não invente números.

Contexto do painel (para interpretar pedidos):
- /basecalculo: planilha auditável do índice; placar (IRE/TIRE/PRA/TPRA), gráficos e descritivos.
- /m: cockpit mobile (abas ticker, redes, plenário, etc.) com o card SOST-IDX.
- IRE (Índice de Reputação Eleitoral): nota composta 0–100 = Sentimento 40% + Menções 25% + Imprensa 20% + Crescimento da base 15%.
- PRA = 100 − IRE÷média×100; TIRE = ΔIRE 7d; TPRA = média do ΔIRE 7d dos adversários.
- Fontes reais: sentimento (pysentimiento/BERT-PT), menções (Wikipedia pageviews), imprensa (Google News), crescimento (Δ7d de seguidores).
- Pesos vivem em watchlist.pesosIndice (data/watchlist.json); o cálculo em lib/index-real.ts.

Formato: itens curtos começando com "•". Sem rodeios.`;

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const body = await request.json().catch(() => ({}));
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) {
    return NextResponse.json({ ok: false, error: "empty_prompt" }, { status: 400, headers: noStore });
  }

  const result = await aiChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Briefing do visitante:\n${texto}\n\nO que precisa ser feito?` },
    ],
    { temperature: 0.3, maxTokens: 220 },
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, provider: result.provider },
      { status: 502, headers: noStore },
    );
  }

  return NextResponse.json(
    { ok: true, reply: result.text, provider: result.provider },
    { headers: noStore },
  );
}
