import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { aiChat } from "@/lib/ai/client";

const noStore = { "Cache-Control": "no-store" };

// Glossário do cockpit: responde dúvidas sobre o projeto e os índices (IRE, PRA,
// TIRE, TPRA, pilares e a nota 0–100). Tom: curto, direto e objetivo, mas sempre
// entregando a resposta à dúvida, e sempre gentil.
const SYSTEM = `Você é o assistente do cockpit eleitoral (painel da campanha de Sóstenes Cavalcante, PL-RJ).
Explique conceitos do projeto e dos índices em português do Brasil, de forma CURTA, DIRETA e OBJETIVA — mas sempre entregando a resposta à dúvida, e sempre gentil. Use no máximo 3 frases.

Glossário (a base das respostas):
- IRE (Índice de Reputação Eleitoral): nota composta de 0 a 100 = Sentimento 40% + Menções 25% + Imprensa 20% + Crescimento da base 15%. É o número-título da reputação digital. 50 = na média do páreo.
- Reputação: o próprio IRE — responde "como anda a reputação digital do candidato".
- Sentimento (40%): tom das manchetes reais, classificado por IA em português (pysentimiento/BERT-PT). Acima de 100 = clima favorável.
- Menções (25%): atenção pública medida pelas visitas diárias ao artigo do candidato na Wikipedia (pageviews).
- Imprensa (20%): volume de cobertura jornalística (Google News) — ritmo de matérias vs. o normal do candidato.
- Crescimento da base (15%): variação % dos seguidores somados das redes nos últimos 7 dias.
- Nota 0–100 (z-score): cada pilar vira nota 50 + 20 × (valor − média) ÷ desvio, comparando o candidato com a média do páreo (50 = na média).
- PRA (Posição Relativa Adversários): (IRE ÷ média × 100) − 100, em %. 0 = na média; positivo = à frente dos adversários; negativo = atrás.
- TIRE: tendência do IRE do candidato nos últimos 7 dias (▲ subindo, ▬ estável, ▼ caindo).
- TPRA: média da tendência (ΔIRE 7 dias) dos concorrentes do RJ.
- Só entra na conta o ingrediente com dado REAL do candidato; sem fonte real, é excluído e os pesos são renormalizados.

Se a pergunta fugir do projeto/índices, responda com gentileza que só ajuda com dúvidas do painel. Nunca invente números; explique os conceitos.`;

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore },
    );
  }

  const body = await request.json().catch(() => ({}));
  const pergunta =
    typeof body?.pergunta === "string"
      ? body.pergunta.trim()
      : typeof body?.prompt === "string"
        ? body.prompt.trim()
        : "";

  if (!pergunta) {
    return NextResponse.json(
      { error: "empty_prompt" },
      { status: 400, headers: noStore },
    );
  }

  const result = await aiChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: pergunta },
    ],
    { temperature: 0.4, maxTokens: 260 },
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
