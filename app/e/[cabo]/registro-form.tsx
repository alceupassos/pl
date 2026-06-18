"use client";

import { useState } from "react";

function formatWpp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function RegistroForm({ caboId, caboNome }: { caboId: string; caboNome: string | null }) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome.trim() || whatsapp.replace(/\D/g, "").length < 10) {
      setErro("Preencha seu nome e um WhatsApp válido com DDD.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/eleitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caboId, nome, whatsapp, cidade }),
      });
      if (!r.ok) throw new Error("falha");
      setPronto(true);
    } catch {
      setErro("Não foi possível cadastrar agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", padding: "8px 0 18px" }}>
          <div style={kicker}>DEP. SÓSTENES CAVALCANTE · PL-RJ</div>
          <div style={titulo}>Seja um Eleitor Ativo</div>
          {caboNome ? (
            <div style={{ fontSize: 12.5, color: "#8a93a8", marginTop: 6 }}>
              indicado por <strong style={{ color: "#c8d0e0" }}>{caboNome}</strong>
            </div>
          ) : null}
        </div>

        {pronto ? (
          <div style={card}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#16C784", marginBottom: 8 }}>
              Pronto! Você é Eleitor Ativo ✅
            </div>
            <p style={{ fontSize: 13.5, color: "#c8d0e0", lineHeight: 1.6, margin: "0 0 14px" }}>
              Em instantes a equipe do Sóstenes vai te chamar no WhatsApp. Salve nosso contato pra
              não perder nenhuma novidade:
            </p>
            <a href="/api/vcard" style={botaoSec}>
              📇 Salvar contato do candidato
            </a>
          </div>
        ) : (
          <form onSubmit={enviar} style={card}>
            <p style={{ fontSize: 13, color: "#8a93a8", lineHeight: 1.55, margin: "0 0 14px" }}>
              Cadastre-se para acompanhar a campanha, participar das pesquisas e receber novidades
              direto no seu WhatsApp.
            </p>
            <label style={lbl}>
              Nome completo
              <input style={inp} value={nome} autoComplete="name" onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
            </label>
            <label style={lbl}>
              WhatsApp
              <input
                style={inp}
                value={whatsapp}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(21) 99999-9999"
                onChange={(e) => setWhatsapp(formatWpp(e.target.value))}
              />
            </label>
            <label style={lbl}>
              Cidade/bairro (opcional)
              <input style={inp} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Onde você mora" />
            </label>
            {erro ? <div style={erroBox}>{erro}</div> : null}
            <button type="submit" disabled={enviando} style={{ ...botao, opacity: enviando ? 0.6 : 1 }}>
              {enviando ? "Enviando…" : "Quero ser Eleitor Ativo"}
            </button>
            <a href="/api/vcard" style={{ ...botaoSec, marginTop: 8 }}>
              📇 Salvar contato do candidato
            </a>
          </form>
        )}
        <div style={{ textAlign: "center", fontSize: 10.5, color: "#5b6478", marginTop: 16 }}>
          Seus dados são usados apenas para contato da campanha (LGPD).
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#0b0e14",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  fontFamily: "system-ui, sans-serif",
};
const kicker: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.16em",
  color: "#7fb0ff",
};
const titulo: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: "#e8ecf4",
  letterSpacing: "-0.02em",
  marginTop: 6,
};
const card: React.CSSProperties = {
  background: "#0e1320",
  border: "1px solid #1e2638",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const lbl: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#8a93a8",
};
const inp: React.CSSProperties = {
  background: "#121724",
  border: "1px solid #1e2638",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 15,
  color: "#e8ecf4",
  outline: "none",
};
const botao: React.CSSProperties = {
  background: "#0ecb81",
  color: "#06210f",
  border: "none",
  borderRadius: 12,
  padding: "15px 24px",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 4,
};
const botaoSec: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  background: "transparent",
  color: "#7fb0ff",
  border: "1px solid #2a3550",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13.5,
  fontWeight: 700,
  textDecoration: "none",
};
const erroBox: React.CSSProperties = {
  background: "rgba(207,61,69,0.1)",
  border: "1px solid rgba(207,61,69,0.35)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 12.5,
  color: "#cf3d45",
};
