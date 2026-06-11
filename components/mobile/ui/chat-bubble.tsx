"use client";

// Bolha de chat estilo WhatsApp para a aba Voz do eleitorado.
// O "há X min" usa agoraS (derivado do lastAt do canal) vs msg.t — ambos vêm
// dos dados; nunca Date.now() em render.

import { MAvatar } from "@/components/mobile/ui/m-avatar";
import { getAvatar } from "@/lib/avatars";
import type { VozFonte, VozMsg } from "@/lib/live-schemas";

// Cor de cada fonte (eleitor verde; redes na cor da marca).
const FONTE_COR: Record<VozFonte, string> = {
  eleitor: "#16C784",
  x: "#d6dbe2",
  instagram: "#E1306C",
  facebook: "#1877F2",
  youtube: "#FF4444",
};

// Ícone textual da rede (mostrado ao lado do handle).
const FONTE_ICONE: Record<Exclude<VozFonte, "eleitor">, string> = {
  x: "X",
  instagram: "IG",
  facebook: "FB",
  youtube: "YT",
};

// Cor da borda esquerda da bolha conforme o sentimento da mensagem.
const SENT_COR: Record<VozMsg["sentimento"], string> = {
  pos: "#16C784",
  neg: "#EA3943",
  neu: "#8a93a8",
};

export function ChatBubble({ msg, agoraS }: { msg: VozMsg; agoraS: number }) {
  const corFonte = FONTE_COR[msg.fonte];
  const minutos = Math.max(0, Math.round((agoraS * 1000 - msg.t) / 60000));
  const ehEleitor = msg.fonte === "eleitor";

  return (
    <div style={{ display: "flex", gap: 8, padding: "7px 0" }}>
      {ehEleitor ? (
        <MAvatar src={getAvatar("eleitor")} nome={msg.nome} cor="#16C784" size={30} />
      ) : (
        <MAvatar nome={msg.nome} cor={corFonte} size={30} />
      )}
      <div
        style={{
          flex: 1,
          background: "#1a2030",
          borderRadius: "4px 14px 14px 14px",
          padding: "8px 11px",
          borderLeft: `3px solid ${SENT_COR[msg.sentimento]}`,
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 12, color: corFonte }}>{msg.nome}</span>
          <span className="m-muted-c" style={{ fontSize: 10 }}>
            {msg.fonte === "eleitor"
              ? ` · ${msg.bairro ?? ""} ${msg.regiao ? `(${msg.regiao})` : ""}`
              : ` · ${FONTE_ICONE[msg.fonte]}`}
          </span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>{msg.texto}</div>
        <div className="m-feed-meta">
          <span>há {minutos} min</span>
          {msg.curtidas ? <span>· ♥ {msg.curtidas}</span> : null}
        </div>
      </div>
    </div>
  );
}
