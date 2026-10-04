"use client";
import type { BocaPesquisa } from "@/lib/telao/boca-de-urna";
import { auditResearch } from "@/lib/telao/research-audit";
export function Methodology({ pesquisa, candidates }: { pesquisa?: BocaPesquisa; candidates: {num: number}[] }) {
 const audit = pesquisa ? auditResearch(pesquisa, candidates) : null;
 return <details className="cm-method"><summary title="Consulte fonte, cobertura, base de cálculo e limitações antes de comparar os números.">Metodologia e auditoria <span>{audit ? "Fonte pendente de validação" : "Sobre os dados"}</span></summary><div>
 <h3>Como ler este painel</h3><p>Votos: percentual dos votos válidos do cargo e recorte selecionados. Urnas: seções totalizadas ÷ seções esperadas. São denominadores diferentes. Percentuais de regiões usam somas de seções, sem média simples dos estados.</p>
 <p>Apuração parcial pode mudar. Liderança não significa eleição. Projeções de cadeiras não substituem a proclamação oficial; federações são identificadas separadamente de partidos. O hemiciclo de candidaturas conta pessoas no cadastro, não cadeiras conquistadas.</p>
 <p>Segundo turno para presidente e governador: maioria absoluta dos votos válidos decide o primeiro turno. Distância para 50% não é probabilidade. Sem modelo validado, a chance de segundo turno é indisponível.</p>
 {pesquisa && audit && <><h3>{pesquisa.instituto} · {pesquisa.divulgadoEm}</h3><p>Fonte informada: {pesquisa.fonte}. Amostra: {pesquisa.entrevistas || "não informada"}. Margem informada: ±{pesquisa.margem} pp. {audit.covered}/{audit.total} candidatos cobertos; soma publicada {audit.sum.toFixed(1)}%.</p><ul>{audit.issues.map(x => <li key={x}>{x}</li>)}</ul><p>Não preenchermos candidatos ausentes com zero. No Senado, verificar se a base representa eleitores ou escolhas, pois há dois votos por eleitor em 2026.</p></>}
 <p><a href="https://resultados.tse.jus.br/" target="_blank" rel="noreferrer">Resultados oficiais do TSE</a> · <a href="https://pesqele-divulgacao.tse.jus.br/" target="_blank" rel="noreferrer">Conferir registro da pesquisa</a> · <a href="https://www.tse.jus.br/comunicacao/noticias/2022/Abril/voce-sabe-o-que-e-eleicao-em-dois-turnos-o-glossario-explica" target="_blank" rel="noreferrer">Regra do segundo turno</a></p>
 <p>Uso interno de partidos. Este sistema não é um canal público nem possui chancela do TSE. Vídeos de ambientação gerados por inteligência artificial (Veo 3.1 Fast / Gemini); não representam pessoas ou acontecimentos reais.</p></div></details>;
}
