"use client";

// Lista completa de notícias (/telao/notícias). Segue o tema do telão:
// claro "wood" (padrão) ou escuro, salvo em localStorage "telao-tema".

import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { Noticia } from "@/lib/telao/noticias";

type Tema = "wood" | "escuro";
const EVENTO_TEMA = "telao-tema";

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

  const unicas = useMemo(() => {
    const seen = new Set<string>();
    return news.filter((n) => {
      const key = normalize(n.titulo);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [news]);

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
        <p className="news-count" aria-live="polite">
          {items.length} {items.length === 1 ? "notícia" : "notícias"} · mais recentes primeiro
        </p>
      </div>

      <div className="news-list">
        {items.map((n) => (
          <article key={n.link} style={{ ["--c" as string]: n.cor }}>
            <div className="news-meta">
              <span className="news-fonte">{n.nome}</span>
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
        Coleta automática de RSS públicos, com cache de até 5 minutos e janela de 12 horas. A disponibilidade
        depende dos veículos; a lista não representa cobertura completa de cada cargo.
      </footer>
    </main>
  );
}
