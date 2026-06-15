"use client";

import { useEffect, useState } from "react";

import { SectionLeitura } from "@/components/mobile/ui/section-leitura";

const ELEICAO_1_MS = new Date("2026-10-04T08:00:00-03:00").getTime();
const ELEICAO_2_MS = new Date("2026-10-25T08:00:00-03:00").getTime();

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "Apuração ao vivo";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${d}d ${h}h ${m}m`;
}

export default function ApuracaoWTab() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const ate1 = ELEICAO_1_MS - now;
  const ate2 = ELEICAO_2_MS - now;

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Apuração ao vivo — TSE</span>
        </div>

        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div className="m-muted-c" style={{ fontSize: 11, marginBottom: 8 }}>
            1º Turno — 4 de outubro de 2026
          </div>
          <div className="m-quote-val" style={{ fontSize: 26, marginBottom: 6 }}>
            {fmtCountdown(ate1)}
          </div>
          {ate1 > 0 && (
            <div className="m-muted-c" style={{ fontSize: 10.5, maxWidth: 260, margin: "0 auto" }}>
              A apuração em tempo real estará disponível a partir do fechamento das urnas (17h de
              Brasília).
            </div>
          )}
          {ate1 <= 0 && (
            <div className="m-ghost" style={{ marginTop: 16 }}>
              Conectando ao JSON de resultados TSE…
            </div>
          )}
        </div>

        {ate2 > 0 && ate1 <= 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "12px 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="m-muted-c" style={{ fontSize: 10 }}>
              2º Turno — 25 de outubro de 2026 · {fmtCountdown(ate2)}
            </div>
          </div>
        )}
      </div>

      <div className="m-card" style={{ marginTop: 12 }}>
        <div className="m-card-head">
          <span className="m-card-title">Como funciona</span>
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.6, color: "var(--m-muted)" }}>
          <p style={{ margin: "0 0 8px" }}>
            Na noite da eleição, o TSE publica arquivos JSON estáticos em{" "}
            <code style={{ fontSize: 10 }}>resultados.tse.jus.br</code> a cada ~30s.
          </p>
          <p style={{ margin: 0 }}>
            Esta aba fará polling desses arquivos e atualizará os totais por cargo (Presidente,
            Governador, Senador, Dep. Federal) em tempo real, sem precisar recarregar a página.
          </p>
        </div>
      </div>

      <SectionLeitura>
        Polling de resultados.tse.jus.br a cada 30s durante a apuração. Fonte oficial TSE.
      </SectionLeitura>
    </div>
  );
}
