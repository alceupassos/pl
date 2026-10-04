"use client";

// Formulário para lançar a boca de urna assim que o instituto divulga (17h).
// Lista os candidatos oficiais do pleito; basta digitar o % de cada um.

import { useEffect, useState } from "react";

import type { BocaDeUrna, BocaPesquisa, BocaPleitoId } from "@/lib/telao/boca-de-urna";
import type { PleitoSnapshot } from "@/lib/telao/tse-apuracao";

type Form = {
  instituto: string;
  divulgadoEm: string;
  margem: string;
  entrevistas: string;
  fonte: string;
  pct: Record<number, string>;
};

const VAZIO: Form = { instituto: "", divulgadoEm: "17:00", margem: "2", entrevistas: "", fonte: "", pct: {} };

function toForm(p?: BocaPesquisa): Form {
  if (!p) return { ...VAZIO, pct: {} };
  return {
    instituto: p.instituto,
    divulgadoEm: p.divulgadoEm,
    margem: String(p.margem),
    entrevistas: p.entrevistas ? String(p.entrevistas) : "",
    fonte: p.fonte,
    pct: Object.fromEntries(p.cand.map((c) => [c.num, String(c.pct)])),
  };
}

function titulo(nome: string): string {
  return nome.toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

export function BocaEditor({ pleitos }: { pleitos: PleitoSnapshot[] }) {
  const [dados, setDados] = useState<BocaDeUrna>({});
  const [sel, setSel] = useState<BocaPleitoId>(pleitos[0].id as BocaPleitoId);
  const [form, setForm] = useState<Form>(VAZIO);
  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState<"boca" | "pesquisa">("boca");

  useEffect(() => {
    fetch(`/api/telao/boca-de-urna?tipo=${tipo}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: BocaDeUrna) => {
        setDados(d);
        setForm(toForm(d[pleitos[0].id as BocaPleitoId]));
      })
      .catch(() => setMsg("não foi possível carregar"));
  }, [pleitos, tipo]);

  const pleito = pleitos.find((p) => p.id === sel)!;
  // candidatos únicos por número (o TSE às vezes duplica registros)
  const cands = pleito.candidatos.filter((c, i, a) => a.findIndex((x) => x.num === c.num) === i);
  const soma = Object.values(form.pct).reduce((s, v) => s + (Number(v.replace(",", ".")) || 0), 0);

  function trocar(id: BocaPleitoId) {
    setSel(id);
    setForm(toForm(dados[id]));
    setMsg("");
  }

  async function salvar(apagar = false) {
    setMsg("salvando…");
    const pesquisa: BocaPesquisa | null = apagar
      ? null
      : {
          instituto: form.instituto,
          divulgadoEm: form.divulgadoEm,
          margem: Number(form.margem.replace(",", ".")) || 0,
          entrevistas: Number(form.entrevistas.replace(/\D/g, "")) || 0,
          fonte: form.fonte,
          cand: cands.filter((c) => (form.pct[c.num] ?? "").trim() !== "").map((c) => ({
            num: c.num,
            nome: c.n,
            partido: c.p,
            pct: Number((form.pct[c.num] ?? "").replace(",", ".")),
          })),
        };
    const r = await fetch(`/api/telao/boca-de-urna?tipo=${tipo}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pleito: sel, pesquisa }),
    });
    if (r.status === 401) return setMsg("Sessão administrativa necessária para editar pesquisas.");
    if (!r.ok) return setMsg("erro ao salvar");
    const d = (await r.json()) as BocaDeUrna;
    setDados(d);
    if (apagar) setForm(toForm(undefined));
    setMsg(apagar ? "pesquisa removida do telão" : "✓ salvo — já aparece no telão em até 30s");
  }

  return (
    <main className="telao pl-wall pl-editor">
      <header className="pl-head">
        <div className="pl-brand">
          <div>
            <div className="pl-kicker">
              TELÃO · {tipo === "boca" ? "PESQUISA DE BOCA DE URNA" : "ÚLTIMA PESQUISA REGISTRADA"}
            </div>
            <h1 className="pl-title">Lançar levantamento</h1>
          </div>
        </div>
        <nav className="pl-tabs">
          {pleitos.map((p) => (
            <button key={p.id} className={p.id === sel ? "on" : ""} onClick={() => trocar(p.id as BocaPleitoId)}>
              <span>{p.titulo}</span>
              {dados[p.id as BocaPleitoId] ? <em>✓</em> : null}
            </button>
          ))}
        </nav>
        <div className="pl-modos">
          {(["boca", "pesquisa"] as const).map((t) => (
            <button
              key={t}
              className={tipo === t ? "on" : ""}
              onClick={() => {
                setTipo(t);
                setMsg("");
              }}
            >
              {t === "boca" ? "Boca de urna" : "Última pesquisa"}
            </button>
          ))}
        </div>
        <a className="pl-filtro-btn" href="/telao/pleitos">
          ← voltar ao telão
        </a>
      </header>

      <section className="pl-ed-body">
        <div className="pl-ed-meta">
          <label>
            Instituto
            <input
              value={form.instituto}
              placeholder="Ipec, Quaest, AtlasIntel…"
              onChange={(e) => setForm({ ...form, instituto: e.target.value })}
            />
          </label>
          <label>
            Divulgado às
            <input value={form.divulgadoEm} onChange={(e) => setForm({ ...form, divulgadoEm: e.target.value })} />
          </label>
          <label>
            Margem de erro (± p.p.)
            <input value={form.margem} onChange={(e) => setForm({ ...form, margem: e.target.value })} />
          </label>
          <label>
            Entrevistas
            <input value={form.entrevistas} onChange={(e) => setForm({ ...form, entrevistas: e.target.value })} />
          </label>
          <label className="pl-ed-wide">
            Fonte / veículo
            <input
              value={form.fonte}
              placeholder="TV Globo / g1, CNN Brasil…"
              onChange={(e) => setForm({ ...form, fonte: e.target.value })}
            />
          </label>
        </div>

        <div className="pl-ed-cands">
          {cands.map((c) => (
            <label key={c.num} className="pl-ed-cand">
              <span className="tl-mono pl-ed-num">{c.num}</span>
              <span className="pl-ed-nome">
                {titulo(c.n)} <em>{c.p}</em>
              </span>
              <input
                inputMode="decimal"
                placeholder="%"
                value={form.pct[c.num] ?? ""}
                onChange={(e) => setForm({ ...form, pct: { ...form.pct, [c.num]: e.target.value } })}
              />
            </label>
          ))}
        </div>

        <div className="pl-ed-actions">
          <span className={`tl-mono ${soma > 100.5 ? "pl-ed-warn" : ""}`}>
            soma: {soma.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            {sel === "senador-sp" ? " (senado: até 2 votos, pode passar de 100%)" : " (votos válidos ≈ 100%)"}
          </span>
          <button className="pl-ed-del" onClick={() => salvar(true)}>
            Remover do telão
          </button>
          <button className="pl-ed-save" onClick={() => salvar(false)}>
            Salvar e publicar no telão
          </button>
          {msg && <span className="pl-ed-msg">{msg}</span>}
        </div>
      </section>
      <a className="pl-assina" href="https://angra.io" target="_blank" rel="noreferrer">
        by ALCEU PASSOS (angra.io)
      </a>
    </main>
  );
}
