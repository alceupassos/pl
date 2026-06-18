"use client";

// Cadastro REAL da rede de campanha (Organizadores de Eleitores): adicionar
// membros (gerentes, cabos, líderes religiosos, deputados estaduais) com metas,
// avanços e WhatsApp; cobrar a meta por IA via whatsgate; ver a conversa.
// Persistência via /api/organizadores; cobrança via /api/cobranca/send.

import { Fragment, useCallback, useEffect, useState } from "react";

type Meta = { lista: number; cadastro: number; engajado: number };
type Membro = {
  id: string;
  nome: string;
  nivel: string;
  regiao: string;
  whatsapp: string;
  metas: Meta;
  avancos: Meta;
  status: "ativo" | "atencao" | "inativo";
  optout?: boolean;
};
type Conversa = { id: string; at: string; direcao: "in" | "out"; texto: string };

const NIVEIS = [
  { id: "regional-manager", label: "Gerente", cor: "#3b82f6" },
  { id: "cabo", label: "Cabo eleitoral", cor: "#22c55e" },
  { id: "church-leader", label: "Líder religioso", cor: "#8b5cf6" },
  { id: "state-deputy", label: "Deputado estadual", cor: "#f0c030" },
] as const;
const nivelLabel = (id: string) => NIVEIS.find((n) => n.id === id)?.label ?? id;
const nivelCor = (id: string) => NIVEIS.find((n) => n.id === id)?.cor ?? "#8a93a8";
const pct = (m: Membro) =>
  (m.metas?.cadastro ?? 0) > 0 ? Math.round((m.avancos.cadastro / m.metas.cadastro) * 100) : 0;

export function RedeCadastro() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [eleitoresPorCabo, setEleitoresPorCabo] = useState<Record<string, number>>({});
  const [qrAberto, setQrAberto] = useState<string | null>(null);
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const [msg, setMsg] = useState("");
  // form
  const [nome, setNome] = useState("");
  const [nivel, setNivel] = useState<string>("cabo");
  const [regiao, setRegiao] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [metaCad, setMetaCad] = useState("");
  // conversa aberta
  const [aberto, setAberto] = useState<string | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/organizadores", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setMembros(d.membros ?? []);
      setEleitoresPorCabo(d.eleitoresPorCabo ?? {});
    }
  }, []);
  useEffect(() => {
    let vivo = true;
    fetch("/api/organizadores", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { membros: [], eleitoresPorCabo: {} }))
      .then((d) => {
        if (vivo) {
          setMembros(d.membros ?? []);
          setEleitoresPorCabo(d.eleitoresPorCabo ?? {});
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  async function adicionar() {
    if (!nome.trim()) return;
    setMsg("salvando…");
    const r = await fetch("/api/organizadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        nivel,
        regiao,
        whatsapp,
        metas: { lista: 0, cadastro: Number(metaCad) || 0, engajado: 0 },
      }),
    });
    setMsg(r.ok ? "adicionado ✓" : "erro ao salvar");
    if (r.ok) {
      setNome("");
      setRegiao("");
      setWhatsapp("");
      setMetaCad("");
      await carregar();
    }
  }

  async function patch(id: string, patchObj: Record<string, unknown>) {
    await fetch("/api/organizadores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patchObj }),
    });
    await carregar();
  }

  async function excluir(id: string) {
    await fetch(`/api/organizadores?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await carregar();
  }

  async function cobrar(m: Membro) {
    setMsg(`cobrando ${m.nome.split(" ")[0]}…`);
    const r = await fetch("/api/cobranca/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.sent) setMsg(`enviado p/ ${m.nome.split(" ")[0]}: "${d.mensagem?.slice(0, 60)}…"`);
    else if (d.mensagem) setMsg(`gerado (não enviou — whatsgate?): "${d.mensagem.slice(0, 60)}…"`);
    else setMsg(`falha ao cobrar (${d.error ?? "erro"})`);
  }

  async function verConversa(id: string) {
    if (aberto === id) {
      setAberto(null);
      return;
    }
    setAberto(id);
    const r = await fetch(`/api/conversas?membroId=${encodeURIComponent(id)}`, { cache: "no-store" });
    setConversas(r.ok ? (await r.json()).conversas ?? [] : []);
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <style>{`
        .rede-inp {
          background: #121724;
          border: 1px solid #1e2638;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 12.5px;
          color: #e8ecf4;
          font-family: inherit;
          outline: none;
          width: 100%;
        }
        .rede-inp:focus { border-color: #2a5fbd; }
      `}</style>
      <div className="card-header">
        <div className="card-title">Cadastro da Rede — gerentes · cabos · líderes · deputados</div>
        <span className="card-badge badge-real">{membros.length} cadastrados</span>
      </div>

      {/* Formulário de novo membro */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1.1fr 0.8fr auto",
          gap: 8,
          alignItems: "center",
          margin: "8px 0 12px",
        }}
      >
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="rede-inp" />
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="rede-inp">
          {NIVEIS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
        <input placeholder="Região" value={regiao} onChange={(e) => setRegiao(e.target.value)} className="rede-inp" />
        <input placeholder="WhatsApp (DDD)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rede-inp" />
        <input placeholder="Meta cad." inputMode="numeric" value={metaCad} onChange={(e) => setMetaCad(e.target.value)} className="rede-inp" />
        <button type="button" className="chip active" onClick={adicionar}>
          + Adicionar
        </button>
      </div>
      {msg ? <div style={{ fontSize: 12, color: "#9fe7ff", marginBottom: 8 }}>{msg}</div> : null}

      {/* Tabela de membros */}
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Nível</th>
              <th>Região</th>
              <th>Meta</th>
              <th>Avanço</th>
              <th>%</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <Fragment key={m.id}>
                <tr>
                  <td>
                    {m.nome}
                    {m.optout ? <span style={{ color: "#EA3943", fontSize: "0.8em" }}> · opt-out</span> : null}
                  </td>
                  <td>
                    <span style={{ color: nivelCor(m.nivel) }}>{nivelLabel(m.nivel)}</span>
                  </td>
                  <td>{m.regiao || "—"}</td>
                  <td>{m.metas?.cadastro ?? 0}</td>
                  <td>
                    <input
                      defaultValue={m.avancos?.cadastro ?? 0}
                      inputMode="numeric"
                      className="rede-inp"
                      style={{ width: 64 }}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== (m.avancos?.cadastro ?? 0))
                          patch(m.id, { avancos: { ...m.avancos, cadastro: v } });
                      }}
                    />
                  </td>
                  <td style={{ color: pct(m) >= 100 ? "#16C784" : pct(m) >= 60 ? "#F5A623" : "#EA3943" }}>
                    {pct(m)}%
                  </td>
                  <td>
                    <select
                      value={m.status}
                      className="rede-inp"
                      onChange={(e) => patch(m.id, { status: e.target.value })}
                    >
                      <option value="ativo">ativo</option>
                      <option value="atencao">atenção</option>
                      <option value="inativo">inativo</option>
                    </select>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {m.nivel === "cabo" ? (
                      <>
                        <button
                          type="button"
                          className="chip"
                          onClick={() => setQrAberto(qrAberto === m.id ? null : m.id)}
                          title="QR de cadastro de eleitores deste cabo"
                        >
                          QR ({eleitoresPorCabo[m.id] ?? 0})
                        </button>{" "}
                      </>
                    ) : null}
                    <button type="button" className="chip" onClick={() => cobrar(m)} title="Gerar e enviar cobrança por IA">
                      Cobrar
                    </button>{" "}
                    <button type="button" className="chip" onClick={() => verConversa(m.id)}>
                      Conversa
                    </button>{" "}
                    <button type="button" className="chip" onClick={() => excluir(m.id)} style={{ color: "#EA3943" }}>
                      ✕
                    </button>
                  </td>
                </tr>
                {aberto === m.id ? (
                  <tr key={`${m.id}-conv`}>
                    <td colSpan={8}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0" }}>
                        {conversas.length === 0 ? (
                          <span style={{ color: "#8a93a8", fontSize: 12 }}>Sem conversas ainda.</span>
                        ) : (
                          conversas.map((c) => (
                            <div
                              key={c.id}
                              style={{
                                alignSelf: c.direcao === "out" ? "flex-end" : "flex-start",
                                maxWidth: "75%",
                                background: c.direcao === "out" ? "rgba(22,199,132,0.14)" : "rgba(255,255,255,0.06)",
                                border: "1px solid var(--m-border, #1e2638)",
                                borderRadius: 10,
                                padding: "6px 10px",
                                fontSize: 12.5,
                              }}
                            >
                              {c.texto}
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
                {qrAberto === m.id ? (
                  <tr key={`${m.id}-qr`}>
                    <td colSpan={8}>
                      {(() => {
                        const url = `${origin}/e/${m.id}`;
                        const qr = `/api/qr?data=${encodeURIComponent(url)}`;
                        return (
                          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "8px 0" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qr} alt="QR de cadastro" width={150} height={150} style={{ background: "#fff", borderRadius: 8, padding: 6 }} />
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: "#8a93a8" }}>Link de cadastro de eleitores — cabo {m.nome}:</div>
                              <a href={url} target="_blank" rel="noreferrer" style={{ color: "#7fb0ff", fontSize: 12.5, wordBreak: "break-all" }}>
                                {url}
                              </a>
                              <div style={{ fontSize: 12, color: "#16C784" }}>{eleitoresPorCabo[m.id] ?? 0} eleitores ativos captados</div>
                              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                                <a href={url} target="_blank" rel="noreferrer" className="chip">Abrir página</a>
                                <a href={qr} target="_blank" rel="noreferrer" className="chip">Abrir QR (imprimir)</a>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {membros.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ color: "#8a93a8" }}>
                  Nenhum membro cadastrado ainda. Use o formulário acima.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
