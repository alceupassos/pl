// m.css dá os tokens .m-app aos espelhos do /m no desktop (ex.: seção
// Plenário); o modo .m-embed evita efeitos colaterais de página inteira.
import "./m/m.css";

import { CampaignCockpit } from "@/components/campaign-cockpit";

export default function Home() {
  return <CampaignCockpit />;
}
