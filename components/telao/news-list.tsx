"use client";

// Lista completa de notícias (/telao/notícias). Segue o tema do telão:
// claro "wood" (padrão) ou escuro, salvo em localStorage "telao-tema".

import { ArrowLeft, Moon, RefreshCw, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { Noticia } from "@/lib/telao/noticias";

type Tema = "wood" | "escuro";
const EVENTO_TEMA = "telao-tema";
const ATUALIZA_MS = 10 * 60_000; // busca novas notícias a cada 10 min
const MAX_NOTICIAS = 400;

const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function lerTema(): Tema {
  return document.documentElement.dataset.tema === "escuro" ? "escuro" : "wood";
}
function assinarTema(cb: () => void) {
  window.addEventListener(EVENTO_TEMA, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO_TEMA, cb);
    window.removeEventListener("storage", cb);
  };
}
function salvarTema(t: Tema) {
  document.documentElement.dataset.tema = t;
  try {
    localStorage.setItem("telao-tema", t);
  } catch {
    /* ignora */
  }
  window.dispatchEvent(new Event(EVENTO_TEMA));
}

export function NewsList({ news }: { news: Noticia[] }) {
  const [query, setQuery] = useState("");
  const [fonte, setFonte] = useState("");
  const tema = useSyncExternalStore(assinarTema, lerTema, () => "wood" as Tema);

  // lista viva: começa com o que veio do servidor e recebe as novas no topo
  const [lista, setLista] = useState<Noticia[]>(news);
  const [novas, setNovas] = useState<Set<string>>(() => new Set());
  const [estado, setEstado] = useState<{ em: number; buscando: boolean; erro: boolean; ultimas: number }>({
    em: 0,
    buscando: false,
    erro: false,
    ultimas: 0,
  });
  const ultimaBusca = useRef(0);
  const listaRef = useRef(lista);
  useEffect(() => {
    listaRef.current = lista;
  }, [lista]);

  const atualizar = useCallback(async () => {
    setEstado((e) => ({ ...e, buscando: true }));
    try {
      const r = await fetch("/api/telao/noticias?todas=1", { cache: "no-store", credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      const chegaram = (await r.json()) as Noticia[];
      ultimaBusca.current = Date.now();
      const atual = listaRef.current;
      const links = new Set(atual.map((n) => n.link));
      const titulos = new Set(atual.map((n) => normalize(n.titulo)));
      const ineditas = chegaram.filter((n) => !links.has(n.link) && !titulos.has(normalize(n.titulo)));
      if (ineditas.length) {
        setLista((prev) => {
          const ja = new Set(prev.map((n) => n.link));
          return [...ineditas.filter((n) => !ja.has(n.link)), ...prev].sort((x, y) => y.t - x.t).slice(0, MAX_NOTICIAS);
        });
      }
      setNovas(new Set(ineditas.map((n) => n.link)));
      setEstado({ em: Date.now(), buscando: false, erro: false, ultimas: ineditas.length });
    } catch {
      setEstado((e) => ({ ...e, buscando: false, erro: true }));
    }
  }, []);

  useEffect(() => {
    ultimaBusca.current = Date.now();
    const id = setInterval(atualizar, ATUALIZA_MS);
    // aba volta ao primeiro plano depois de muito tempo: busca na hora
    const aoVoltar = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimaBusca.current >= ATUALIZA_MS) void atualizar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [atualizar]);

  const unicas = useMemo(() => {
    const seen = new Set<string>();
    return lista.filter((n) => {
      const key = normalize(n.titulo);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [lista]);

  const fontes = useMemo(() => {
    const m = new Map<string, { cor: string; n: number }>();
    for (const n of unicas) m.set(n.nome, { cor: n.cor, n: (m.get(n.nome)?.n ?? 0) + 1 });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [unicas]);

  const items = useMemo(() => {
    const q = normalize(query.trim());
    return unicas.filter(
      (n) => (!fonte || n.nome === fonte) && (!q || normalize(`${n.titulo} ${n.resumo} ${n.nome}`).includes(q)),
    );
  }, [unicas, query, fonte]);

  return (
    <main className="news-page" data-tema={tema}>
      <div className="news-veio" aria-hidden />
      <header className="news-head">
        <div className="news-top">
          <a className="news-back" href="/telao/pleitos">
            <ArrowLeft size={16} aria-hidden /> Voltar ao painel
          </a>
          <button
            type="button"
            className="news-tema"
            onClick={() => salvarTema(tema === "wood" ? "escuro" : "wood")}
            aria-label={tema === "wood" ? "Mudar para o tema escuro" : "Mudar para o tema claro"}
            title={tema === "wood" ? "Tema escuro" : "Tema claro"}
          >
            {tema === "wood" ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
            {tema === "wood" ? "Escuro" : "Claro"}
          </button>
        </div>
        <h1>Notícias de todos os cargos</h1>
        <p>
          Presidente, governador, senador, deputado federal e estadual. Manchetes recentes das fontes disponíveis.
        </p>
      </header>

      <div className="news-ferramentas">
        <label className="news-search">
          <span>Buscar candidato, partido, estado ou assunto</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nas notícias"
          />
        </label>
        {fontes.length > 1 && (
          <nav className="news-fontes" aria-label="Filtrar por veículo">
            <button type="button" className={!fonte ? "on" : ""} aria-pressed={!fonte} onClick={() => setFonte("")}>
              Todos <small>{unicas.length}</small>
            </button>
            {fontes.map(([nome, { cor, n }]) => (
              <button
                key={nome}
                type="button"
                className={fonte === nome ? "on" : ""}
                aria-pressed={fonte === nome}
                style={{ ["--c" as string]: cor }}
                onClick={() => setFonte(fonte === nome ? "" : nome)}
              >
                <i />
                {nome} <small>{n}</small>
              </button>
            ))}
          </nav>
        )}
        <div className="news-count">
          <p aria-live="polite">
            {items.length} {items.length === 1 ? "notícia" : "notícias"} · mais recentes primeiro
            {estado.em > 0 && (
              <>
                {" · "}
                {estado.ultimas > 0 ? (
                  <b className="news-novas-txt">
                    {estado.ultimas} {estado.ultimas === 1 ? "nova" : "novas"} às {hhmm(estado.em)}
                  </b>
                ) : (
                  `sem novidades às ${hhmm(estado.em)}`
                )}
              </>
            )}
            {estado.erro && " · falha ao atualizar, nova tentativa em 10 min"}
          </p>
          <button type="button" className="news-atualizar" onClick={() => void atualizar()} disabled={estado.buscando}>
            <RefreshCw size={14} aria-hidden className={estado.buscando ? "girando" : ""} />
            {estado.buscando ? "Atualizando…" : "Atualizar agora"}
          </button>
        </div>
      </div>

      <div className="news-list">
        {items.map((n) => (
          <article key={n.link} className={novas.has(n.link) ? "news-nova" : ""} style={{ ["--c" as string]: n.cor }}>
            <div className="news-meta">
              <span className="news-fonte">{n.nome}</span>
              {novas.has(n.link) && <span className="news-tag-nova">Nova</span>}
              {n.t > 0 && (
                <time dateTime={new Date(n.t).toISOString()}>
                  {new Date(n.t).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              )}
            </div>
            <h2>
              <a href={n.link} target="_blank" rel="noreferrer">
                {n.titulo} <span aria-hidden="true">↗</span>
              </a>
            </h2>
            {n.resumo && <p>{n.resumo}</p>}
          </article>
        ))}
      </div>
      {!items.length && (
        <p className="news-empty">Nenhuma notícia disponível para esta busca. Tente outro nome ou assunto.</p>
      )}
      <footer>
        Coleta automática de RSS públicos a cada 10 minutos (as novas entram no topo), com cache de até 5
        minutos e janela de 24 horas. A disponibilidade
        depende dos veículos; a lista não representa cobertura completa de cada cargo.
      </footer>
    </main>
  );
}
