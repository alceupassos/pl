import { NextResponse } from "next/server";

// vCard do contato do candidato — o eleitor salva o número da campanha (o mesmo
// que a IA usa para conversar). Número via CAMPANHA_WHATSAPP, fallback à sessão.
const NUMERO = (process.env.CAMPANHA_WHATSAPP || "5511916870066").replace(/\D/g, "");
const NOME = process.env.CAMPANHA_NOME || "Sóstenes Cavalcante";

export async function GET() {
  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${NOME};;;`,
    `FN:${NOME}`,
    "ORG:Campanha Sóstenes Cavalcante",
    `TEL;TYPE=CELL,VOICE:+${NUMERO}`,
    `item1.URL:https://wa.me/${NUMERO}`,
    "END:VCARD",
    "",
  ].join("\r\n");

  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sostenes-cavalcante.vcf"',
      "Cache-Control": "no-store",
    },
  });
}
