"use client";

import { useState } from "react";

const UF_LIST = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

type Situacao = "candidato" | "politica" | "outro";

function gerarUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [situacao, setSituacao] = useState<Situacao | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function formatWpp(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (
      !nome.trim() ||
      !cidade.trim() ||
      !uf ||
      !situacao ||
      !whatsapp.trim()
    ) {
      setErro("Preencha os campos obrigatórios (*).");
      return;
    }

    setEnviando(true);
    try {
      const uid = gerarUid();
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          nome,
          cidade,
          uf,
          situacao,
          whatsapp,
          email,
          pergunta,
        }),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      if (typeof window !== "undefined") {
        localStorage.setItem("scp_reg", "1");
        localStorage.setItem("scp_uid", uid);
      }
      onComplete();
    } catch {
      setErro("Erro ao enviar. Tente novamente.");
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

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 88px",
              gap: 10,
            }}
          >
            <Field label="Cidade *">
              <input
                type="text"
                autoComplete="address-level2"
                placeholder="Sua cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </Field>
            <Field label="Estado *">
              <select value={uf} onChange={(e) => setUf(e.target.value)}>
                <option value="">UF</option>
                {UF_LIST.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Sua situação *">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingTop: 2,
              }}
            >
              {(
                [
                  ["candidato", "Candidato(a)"],
                  ["politica", "Trabalha com política"],
                  ["outro", "Nenhuma das opções"],
                ] as [Situacao, string][]
              ).map(([val, label]) => (
                <label
                  key={val}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 13.5,
                    color: "#c8d0e0",
                  }}
                >
                  <input
                    type="radio"
                    name="situacao"
                    value={val}
                    checked={situacao === val}
                    onChange={() => setSituacao(val)}
                    style={{ accentColor: "#0ecb81", width: 16, height: 16 }}
                  />
                  {label}
                </label>
              ))}
            </div>
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

          <Field label="E-mail">
            <input
              type="email"
              autoComplete="email"
              placeholder="seu@email.com (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Pergunta ou comentário">
            <textarea
              placeholder="O que você gostaria de saber? (opcional)"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              rows={3}
              style={{ resize: "none" }}
            />
          </Field>

          {erro && (
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
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            style={{
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
            }}
          >
            {enviando ? "Enviando…" : "Acessar o Cockpit →"}
          </button>
        </form>

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
        .scp-field select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a93a8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
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
