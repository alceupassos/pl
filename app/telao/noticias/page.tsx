import { NOTICIAS_TODAS, getNoticias } from "@/lib/telao/noticias";
import { NewsList } from "@/components/telao/news-list";

import "./noticias.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notícias · todos os cargos" };

// aplica o tema do telão antes da pintura (evita piscar claro ↔ escuro)
const TEMA_JS =
  "try{document.documentElement.dataset.tema=localStorage.getItem('telao-tema')==='escuro'?'escuro':'wood'}catch(e){document.documentElement.dataset.tema='wood'}";

export default async function NoticiasPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: TEMA_JS }} />
      <NewsList news={await getNoticias(NOTICIAS_TODAS)} />
    </>
  );
}
