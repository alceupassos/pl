"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  File as FileIcon,
  FilePenLine,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from "lucide-react";

type CampaignAsset = {
  id: string;
  file: File;
  url: string;
  title: string;
  description: string;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAssetKind(file: File) {
  if (file.type.startsWith("image/")) return "Imagem";
  if (file.type.startsWith("video/")) return "Video";
  if (file.type === "application/pdf") return "PDF";
  return file.name.split(".").pop()?.toUpperCase() || "Arquivo";
}

function createDefaultTitle(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function CampaignDownloads() {
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const assetsRef = useRef<CampaignAsset[]>([]);

  const totalSize = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.file.size, 0),
    [assets],
  );

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    return () => {
      assetsRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
    };
  }, []);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setAssets((current) => [
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
        title: createDefaultTitle(file.name),
        description: "",
      })),
      ...current,
    ]);

    event.target.value = "";
  };

  const updateAsset = (id: string, patch: Partial<Pick<CampaignAsset, "title" | "description">>) => {
    setAssets((current) => current.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)));
  };

  const removeAsset = (id: string) => {
    setAssets((current) => {
      const removed = current.find((asset) => asset.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((asset) => asset.id !== id);
    });
  };

  return (
    <div id="sec-downloads" className="section active">
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Arquivos disponíveis</div>
          <div className="kpi-value" style={{ color: "#22c55e" }}>{assets.length}</div>
          <div className="kpi-sub up">prontos para baixar</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Tamanho total</div>
          <div className="kpi-value" style={{ color: "#60a5fa" }}>{formatFileSize(totalSize)}</div>
          <div className="kpi-sub" style={{ color: "var(--texto-sec)" }}>carregado nesta sessão</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Formatos aceitos</div>
          <div className="kpi-value" style={{ color: "#f59e0b" }}>IMG</div>
          <div className="kpi-sub warn">PDF, video e arquivos gerais</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Uso recomendado</div>
          <div className="kpi-value" style={{ color: "#22c55e" }}>Base</div>
          <div className="kpi-sub up">cabos, grupos e coordenadores</div>
        </div>
      </div>

      <div className="downloads-layout">
        <div className="downloads-upload card">
          <div className="card-header">
            <div className="card-title">Upload de Materiais</div>
            <span className="card-badge badge-azul">biblioteca de campanha</span>
          </div>

          <button
            className="upload-dropzone"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <span className="upload-icon"><UploadCloud /></span>
            <span className="upload-title">Enviar arquivos</span>
            <span className="upload-sub">Selecione artes, PDFs, videos, roteiros, santinhos ou kits de postagem</span>
          </button>

          <input
            ref={inputRef}
            className="sr-only-file"
            type="file"
            multiple
            accept="image/*,video/*,application/pdf,.zip,.doc,.docx,.ppt,.pptx"
            onChange={handleFiles}
          />

          <div className="download-guidance">
            <div className="download-guidance-row">
              <span><ImageIcon /></span>
              <div>
                <strong>Thumbnail automatico</strong>
                <p>Imagens e videos aparecem com preview assim que entram na biblioteca.</p>
              </div>
            </div>
            <div className="download-guidance-row">
              <span><FilePenLine /></span>
              <div>
                <strong>Nome e descricao</strong>
                <p>Edite o material para a equipe saber onde usar cada arquivo.</p>
              </div>
            </div>
            <div className="download-guidance-row">
              <span><Download /></span>
              <div>
                <strong>Download direto</strong>
                <p>Cada item fica com botao de baixar usando o arquivo enviado.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="downloads-library">
          {assets.length === 0 ? (
            <div className="downloads-empty card">
              <FolderOpen />
              <div>
                <strong>Nenhum material enviado ainda</strong>
                <p>Suba os arquivos de campanha para montar a vitrine de downloads com thumbnail, nome e finalidade.</p>
              </div>
            </div>
          ) : (
            <div className="downloads-grid">
              {assets.map((asset) => (
                <div className="download-card" key={asset.id}>
                  <div className="download-thumb">
                    {asset.file.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.title || asset.file.name} />
                    ) : asset.file.type.startsWith("video/") ? (
                      <video src={asset.url} muted playsInline />
                    ) : (
                      <div className="download-file-icon">
                        {asset.file.type === "application/pdf" ? <FileText /> : <FileIcon />}
                        <span>{getAssetKind(asset.file)}</span>
                      </div>
                    )}
                  </div>

                  <div className="download-meta">
                    <span className="card-badge badge-cinza">{getAssetKind(asset.file)}</span>
                    <span>{formatFileSize(asset.file.size)}</span>
                  </div>

                  <label className="download-field">
                    <span>Nome do material</span>
                    <input
                      value={asset.title}
                      onChange={(event) => updateAsset(asset.id, { title: event.target.value })}
                      placeholder="Ex.: Santinho frente e verso"
                    />
                  </label>

                  <label className="download-field">
                    <span>Para que serve</span>
                    <textarea
                      value={asset.description}
                      onChange={(event) => updateAsset(asset.id, { description: event.target.value })}
                      placeholder="Ex.: Enviar em grupos de WhatsApp antes de agenda em Angra."
                      rows={3}
                    />
                  </label>

                  <div className="download-actions">
                    <a className="download-button" href={asset.url} download={asset.file.name}>
                      <Download />
                      <span>Baixar</span>
                    </a>
                    <button className="remove-button" type="button" onClick={() => removeAsset(asset.id)}>
                      <Trash2 />
                      <span>Remover</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
