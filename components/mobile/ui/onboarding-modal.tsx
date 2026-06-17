"use client";

import { useState } from "react";

function gerarUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function formatWpp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"form" | "code">("form");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  // Passo 1: valida campos e dispara o código no WhatsApp.
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!nome.trim() || !whatsapp.trim() || !email.trim()) {
      setErro("Preencha nome, WhatsApp e e-mail.");
      return;
    }
    if (whatsapp.replace(/\D/g, "").length < 10) {
      setErro("Informe um WhatsApp válido com DDD.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/whatsapp-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.error === "invalid_phone")
          setErro("Número de WhatsApp inválido.");
        else if (data?.error === "rate_limited")
          setErro("Aguarde alguns segundos antes de pedir um novo código.");
        else setErro("Não foi possível enviar o código. Tente novamente.");
        return;
      }

      setCode("");
      setStep("code");
    } catch {
      setErro("Erro ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  // Passo 2: confere o código e salva o cadastro.
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (code.replace(/\D/g, "").length !== 4) {
      setErro("Digite o código de 4 dígitos.");
      return;
    }

    setEnviando(true);
    try {
      const verifyRes = await fetch("/api/whatsapp-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp, code }),
        signal: AbortSignal.timeout(12000),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok || !verifyData?.token) {
        if (verifyData?.error === "too_many")
          setErro("Muitas tentativas. Peça um novo código.");
        else if (verifyData?.error === "expired")
          setErro("Código expirado. Peça um novo código.");
        else setErro("Código incorreto. Confira e tente de novo.");
        return;
      }

      const uid = gerarUid();
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          nome,
          whatsapp,
          email,
          verifyToken: verifyData.token,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      if (typeof window !== "undefined") {
        localStorage.setItem("scp_reg", "1");
        localStorage.setItem("scp_uid", uid);
      }
      onComplete();
    } catch {
      setErro("Erro ao confirmar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleResend() {
    setErro("");
    setEnviando(true);
    try {
      const res = await fetch("/api/whatsapp-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "rate_limited")
          setErro("Aguarde alguns segundos antes de pedir um novo código.");
        else setErro("Não foi possível reenviar o código.");
      }
    } catch {
      setErro("Não foi possível reenviar o código.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0b0e14",
        overflowY: "auto",
        WebkitOverflowScrolling:
          "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding:
          "env(safe-area-inset-top, 16px) 16px calc(env(safe-area-inset-bottom, 16px) + 16px)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo / título */}
        <div style={{ textAlign: "center", padding: "24px 0 20px" }}>
          <div
            style={{
              fontFamily: "var(--m-font-mono, monospace)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "#8a93a8",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Strategy Partners
          </div>
          <div
            style={{
              fontFamily: "var(--m-font-display, system-ui)",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: "#e8ecf4",
              lineHeight: 1.1,
            }}
          >
            Cockpit de Gestão
            <br />
            Eleitoral
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 8,
              padding: "3px 10px",
              borderRadius: 99,
              border: "1px solid #1e2638",
              background: "rgba(42, 95, 189, 0.1)",
              color: "#7fb0ff",
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Acesso Demonstrativo
          </div>
        </div>

        {/* Texto de boas-vindas */}
        <div
          style={{
            background: "#0e1320",
            border: "1px solid #1e2638",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
            fontSize: 12,
            lineHeight: 1.6,
            color: "#8a93a8",
          }}
        >
          <p style={{ margin: "0 0 10px", color: "#c8d0e0", fontWeight: 600 }}>
            Você está acessando uma amostra do nosso sistema de inteligência
            eleitoral.
          </p>
          <p style={{ margin: "0 0 10px" }}>
            Os dados são coletados de fontes públicas — redes sociais, imprensa
            e institutos de pesquisa — e sua precisão depende da qualidade
            dessas fontes.
          </p>
          <p
            style={{
              margin: 0,
              borderTop: "1px solid #1e2638",
              paddingTop: 10,
            }}
          >
            <span style={{ marginRight: 4 }}>⚖️</span>
            Este sistema opera em conformidade com a legislação eleitoral
            vigente. Não realizamos pesquisa eleitoral própria para divulgação
            pública: nosso papel é organizar, cruzar e transformar dados
            existentes em visão estratégica.
          </p>
        </div>

        {/* Passo 1 — dados */}
        {step === "form" ? (
          <form
            onSubmit={handleRequestCode}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <Field label="Nome completo *">
              <input
                type="text"
                autoComplete="name"
                placeholder="Seu nome e sobrenome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Field>

            <Field label="WhatsApp *">
              <input
                type="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWpp(e.target.value))}
                inputMode="tel"
              />
            </Field>

            <Field label="E-mail *">
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            {erro && <ErrorBox>{erro}</ErrorBox>}

            <button
              type="submit"
              disabled={enviando}
              style={primaryButtonStyle(enviando)}
            >
              {enviando ? "Enviando…" : "Receber código no WhatsApp →"}
            </button>
          </form>
        ) : (
          /* Passo 2 — código */
          <form
            onSubmit={handleVerify}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                color: "#c8d0e0",
              }}
            >
              Enviamos um código de 4 dígitos para o WhatsApp{" "}
              <strong style={{ color: "#e8ecf4" }}>{whatsapp}</strong>. Digite-o
              abaixo para confirmar seu acesso.
            </p>

            <Field label="Código de 4 dígitos *">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="0000"
                maxLength={4}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                style={{
                  letterSpacing: "0.5em",
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              />
            </Field>

            {erro && <ErrorBox>{erro}</ErrorBox>}

            <button
              type="submit"
              disabled={enviando}
              style={primaryButtonStyle(enviando)}
            >
              {enviando ? "Confirmando…" : "Confirmar e acessar →"}
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setErro("");
                }}
                style={linkButtonStyle("#8a93a8")}
              >
                ← Corrigir dados
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={enviando}
                style={linkButtonStyle("#7fb0ff")}
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}

        {/* Contato */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid #1e2638",
            textAlign: "center",
            fontSize: 11,
            color: "#8a93a8",
            lineHeight: 1.8,
          }}
        >
          <div style={{ marginBottom: 6, fontWeight: 600, color: "#c8d0e0" }}>
            Dúvidas?
          </div>
          <a
            href="mailto:contato@strategypartners.com.br"
            style={{
              color: "#7fb0ff",
              display: "block",
            }}
          >
            contato@strategypartners.com.br
          </a>
          <a
            href="https://wa.me/5511972322293"
            style={{ color: "#0ecb81", display: "block" }}
          >
            WhatsApp +55 11 97232-2293
          </a>
        </div>
      </div>

      <style>{`
        .scp-field input,
        .scp-field select,
        .scp-field textarea {
          width: 100%;
          background: #121724;
          border: 1px solid #1e2638;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          color: #e8ecf4;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
          -webkit-appearance: none;
          appearance: none;
        }
        .scp-field input:focus,
        .scp-field select:focus,
        .scp-field textarea:focus {
          border-color: #2a5fbd;
        }
        .scp-field input::placeholder,
        .scp-field textarea::placeholder {
          color: #3a4257;
        }
      `}</style>
    </div>
  );
}

function primaryButtonStyle(enviando: boolean): React.CSSProperties {
  return {
    background: enviando ? "#1e2638" : "#0ecb81",
    color: enviando ? "#8a93a8" : "#0b0e14",
    border: "none",
    borderRadius: 12,
    padding: "15px 24px",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "0.02em",
    cursor: enviando ? "not-allowed" : "pointer",
    transition: "background 0.15s",
    marginTop: 4,
  };
}

function linkButtonStyle(color: string): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    color,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  };
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(207,61,69,0.1)",
        border: "1px solid rgba(207,61,69,0.35)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        color: "#cf3d45",
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="scp-field"
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
      <label
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#8a93a8",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
