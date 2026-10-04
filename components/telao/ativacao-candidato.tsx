"use client";

import { useEffect, useState } from "react";

import type { PerfilCandidato } from "@/lib/telao/candidato-push";
import type { PleitoId } from "@/lib/telao/tse-apuracao";

export function AtivacaoCandidatoModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: (p: PerfilCandidato) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ativadoHoje, setAtivadoHoje] = useState(false);
  const [form, setForm] = useState<{
    nome: string;
    email: string;
    whatsapp: string;
    numero: string;
    cargo: PleitoId;
    uf: string;
    territorio: string;
  }>({
    nome: "",
    email: "",
    whatsapp: "",
    numero: "",
    cargo: "dep-federal-sp",
    uf: "sp",
    territorio: "",
  });

  useEffect(() => {
    fetch("/api/candidato/perfil")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.perfil) {
          const p: PerfilCandidato = data.perfil;
          setForm({
            nome: p.nome || "",
            email: p.email || "",
            whatsapp: p.whatsapp || "",
            numero: p.numero ? String(p.numero) : "",
            cargo: p.cargo || "dep-federal-sp",
            uf: p.uf || "sp",
            territorio: p.territorio || "",
          });
        }
        setAtivadoHoje(!!data?.ativadoHoje);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch("/api/candidato/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          numero: Number(form.numero) || 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAtivadoHoje(true);
        if (onSaved) onSaved(data.perfil);
        setTimeout(onClose, 600);
      }
    } catch {
      alert("Erro ao salvar cadastro. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="pl-dest-ov">
      <div className="pl-dest-box pl-atv-box">
        <div className="pl-kicker">ATIVAÇÃO DIÁRIA DO CANDIDATO</div>
        <h2>{ativadoHoje ? "Cadastro Ativo para Hoje ✓" : "Ativar Cadastro para o Dia"}</h2>
        <p>
          Formulário realizado 1 vez ao dia. Os dados sincronizam entre todos os computadores da campanha e ativam os alertas Push (posição ao vivo + WhatsApp).
        </p>

        {loading ? (
          <div className="pl-mun-vazio">Carregando dados do candidato…</div>
        ) : (
          <form onSubmit={handleSubmit} className="pl-atv-form">
            <div className="pl-atv-row">
              <label>
                <span>Nome do Candidato / Urna</span>
                <input
                  required
                  placeholder="Ex: Deputado Sóstenes"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </label>
              <label>
                <span>Número de Urna</span>
                <input
                  required
                  type="number"
                  placeholder="Ex: 22100"
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                />
              </label>
            </div>

            <div className="pl-atv-row">
              <label>
                <span>E-mail</span>
                <input
                  required
                  type="email"
                  placeholder="candidato@angra.io"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                <span>WhatsApp (com DDD)</span>
                <input
                  required
                  placeholder="21999998888"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </label>
            </div>

            <div className="pl-atv-row">
              <label>
                <span>Cargo</span>
                <select
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value as PleitoId })}
                >
                  <option value="dep-federal-sp">Deputado Federal</option>
                  <option value="dep-estadual-sp">Deputado Estadual / Distrital</option>
                  <option value="governador-sp">Governador</option>
                  <option value="senador-sp">Senador</option>
                  <option value="presidente">Presidente</option>
                </select>
              </label>
              <label>
                <span>Estado (UF)</span>
                <input
                  required
                  maxLength={2}
                  placeholder="RJ, SP, MG…"
                  value={form.uf.toUpperCase()}
                  onChange={(e) => setForm({ ...form, uf: e.target.value.toLowerCase() })}
                />
              </label>
            </div>

            <label>
              <span>Locais / Território Percorrido no Dia</span>
              <textarea
                rows={2}
                placeholder="Ex: Campo Grande, Bangu, Centro do RJ e Zona Oeste"
                value={form.territorio}
                onChange={(e) => setForm({ ...form, territorio: e.target.value })}
              />
            </label>

            <div className="pl-dest-act">
              <button type="button" className="pl-ed-del" onClick={onClose}>
                Fechar
              </button>
              <button type="submit" className="pl-ed-save" disabled={salvando}>
                {salvando ? "Salvando..." : ativadoHoje ? "Atualizar Cadastro do Dia" : "Ativar Cadastro Hoje ✓"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
