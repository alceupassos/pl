"use client";

// Avatar circular do /m: foto quando existe; senão monograma com a cor do ator.
// monogramDataUri gera PNG via canvas offscreen para uso em rich text do ECharts.

import { iniciais } from "@/lib/avatars";

export function MAvatar({
  src,
  nome,
  cor,
  size = 24,
}: {
  src?: string | null;
  nome: string;
  cor: string;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={nome}
        width={size}
        height={size}
        style={{
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid var(--m-border)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: cor + "33",
        color: cor,
        border: `1px solid ${cor}66`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

// Cache module-level: cada monograma é desenhado uma vez por sessão.
const monogramCache = new Map<string, string>();

export function monogramDataUri(nome: string, cor: string, size = 40): string {
  if (typeof document === "undefined") return "";
  const key = `${nome}:${cor}:${size}`;
  const cached = monogramCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const r = size / 2;
  // Fundo (mesma cor de card do tema)
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fillStyle = "#121724";
  ctx.fill();
  // Borda na cor do ator
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.strokeStyle = cor;
  ctx.stroke();
  // Iniciais centradas
  ctx.fillStyle = cor;
  ctx.font = `800 ${Math.round(size * 0.38)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(iniciais(nome), r, r + size * 0.02);

  const uri = canvas.toDataURL("image/png");
  monogramCache.set(key, uri);
  return uri;
}

// Para charts: usa a foto quando existe; senão o monograma desenhado.
export function avatarForChart(
  src: string | null | undefined,
  nome: string,
  cor: string,
): string {
  return src ? src : monogramDataUri(nome, cor);
}
