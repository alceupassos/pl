import { getNoticias } from "@/lib/telao/noticias";
import { NewsList } from "@/components/telao/news-list";
import "./noticias.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Notícias · todos os cargos" };
export default async function NoticiasPage() { return <NewsList news={await getNoticias()}/>; }
