import { candidateDetails } from "@/components/campaign-data";

type CandidateKey = keyof typeof candidateDetails;

type CandidateDetailProps = {
  candidateKey: CandidateKey;
};

function renderDetailRows(rows: readonly (readonly string[])[]) {
  return rows.map(([left, right, extra]) => (
    <div className="detail-row" key={`${left}-${right}`}>
      <span>{left}</span>
      <span style={{ textAlign: "right", color: "var(--branco)", fontWeight: 600 }}>
        {right}
        {extra ? (
          <div style={{ color: "var(--texto-sec)", fontWeight: 400, marginTop: 2 }}>{extra}</div>
        ) : null}
      </span>
    </div>
  ));
}

export function CandidateDetail({ candidateKey }: CandidateDetailProps) {
  const data = candidateDetails[candidateKey];

  return (
    <div id="sec-candidato-detalhe" className="section active">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Monitoramento Individual do Candidato</div>
          <span className="card-badge badge-azul">clique em um card</span>
        </div>
        <div className="detail-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id="detailPhoto" className="detail-photo" src={data.foto} alt={`Foto de ${data.nome}`} />
          <div>
            <div id="detailTitle" className="detail-title">{data.nome}</div>
            <div id="detailSub" className="detail-sub">{data.partido}</div>
            <div id="detailMeta" className="detail-meta">
              {data.meta.map((item) => (
                <span className="card-badge badge-cinza" key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Ações Recentes</div>
              <span className="card-badge badge-real">monitoramento de campo</span>
            </div>
            <div id="detailActions" className="detail-list">{renderDetailRows(data.acoes)}</div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Melhor Rendimento</div>
              <span className="card-badge badge-est">mapa competitivo</span>
            </div>
            <div id="detailPerformance" className="detail-list">{renderDetailRows(data.rendimento)}</div>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Próximos Passos do Adversário</div>
              <span className="card-badge badge-amarelo">janela de observação</span>
            </div>
            <table className="tbl">
              <thead>
                <tr><th>Quando</th><th>Ação</th><th>Local</th><th>Status</th></tr>
              </thead>
              <tbody id="detailNextMoves">
                {data.proximos.map(([quando, acao, local, status]) => (
                  <tr key={`${quando}-${acao}`}>
                    <td>{quando}</td>
                    <td>{acao}</td>
                    <td>{local}</td>
                    <td><span className="card-badge badge-est">{status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Fontes e Referências</div>
              <span className="card-badge badge-real">base pública</span>
            </div>
            <div id="detailSources" className="detail-list">
              {data.fontes.map(([label, url]) => (
                <div className="detail-row" key={`${label}-${url}`}>
                  <span>{label}</span>
                  <span>
                    <a className="link-button" href={url} target="_blank" rel="noopener noreferrer">
                      <i data-lucide="external-link" />
                      <span>Abrir</span>
                    </a>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
