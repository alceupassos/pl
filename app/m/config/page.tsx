"use client";

// /m/config — admin simples: watchlist editável (JSON validado por zod no
// servidor) + opt-in de alertas por web push. Protegido pelo gate do layout.

import Link from "next/link";
import { ArrowLeft, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

export default function MobileConfigPage() {
  const [texto, setTexto] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>("verificando…");

  useEffect(() => {
    let on = true;
    fetch("/api/watchlist", { credentials: "include" })
      .then((r) => r.json())
      .then((w) => {
        if (on) setTexto(JSON.stringify(w, null, 2));
      })
      .catch(() => {
        if (on) setStatus("falha ao carregar a watchlist");
      });

    const id = window.setTimeout(() => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPushStatus("não suportado neste navegador");
      } else if (Notification.permission === "granted") {
        setPushStatus("alertas ativados");
      } else if (Notification.permission === "denied") {
        setPushStatus("bloqueado nas permissões do navegador");
      } else {
        setPushStatus("inativo");
      }
    }, 0);
    return () => {
      on = false;
      window.clearTimeout(id);
    };
  }, []);

  const salvar = async () => {
    setStatus("salvando…");
    let parsed: unknown;
    try {
      parsed = JSON.parse(texto);
    } catch {
      setStatus("JSON inválido — corrija antes de salvar");
      return;
    }
    const response = await fetch("/api/watchlist", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    if (response.ok) {
      setStatus("salvo ✓ — o stream usa a nova watchlist na próxima conexão");
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(
        response.status === 422
          ? `schema inválido: ${JSON.stringify(data.issues?.[0] ?? {})}`
          : "falha ao salvar",
      );
    }
  };

  const ativarPush = async () => {
    try {
      const keyResponse = await fetch("/api/push/subscribe", { credentials: "include" });
      const { publicKey } = await keyResponse.json();
      if (!publicKey) {
        setPushStatus("push desativado no servidor (sem chaves VAPID)");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("permissão negada");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      setPushStatus(save.ok ? "alertas ativados ✓" : "falha ao registrar no servidor");
    } catch {
      setPushStatus("falha ao ativar push");
    }
  };

  return (
    <div className="m-page-scroll" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <header className="m-header" style={{ position: "static", padding: 0, border: "none", background: "none" }}>
        <Link href="/m" className="m-btn" aria-label="Voltar ao cockpit">
          <ArrowLeft size={15} /> Cockpit
        </Link>
        <span className="m-header-brand">CONFIG</span>
      </header>

      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Alertas no celular (web push)</span>
          <span className="m-pill">{pushStatus}</span>
        </div>
        <button type="button" className="m-btn primary" onClick={ativarPush} style={{ width: "100%" }}>
          <BellRing size={15} /> Ativar alertas vermelhos, votações e “falaram de mim”
        </button>
      </div>

      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Watchlist (concorrentes, atores, pesos do índice)</span>
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 320,
            background: "var(--m-card-2)",
            color: "var(--m-text)",
            border: "1px solid var(--m-border)",
            borderRadius: 10,
            padding: 10,
            fontFamily: "var(--m-font-mono)",
            fontSize: 11,
            lineHeight: 1.5,
          }}
          aria-label="Watchlist em JSON"
        />
        <button type="button" className="m-btn primary" onClick={salvar} style={{ width: "100%", marginTop: 8 }}>
          Salvar watchlist
        </button>
        {status ? (
          <div className="m-feed-meta" style={{ marginTop: 6 }}>
            <span>{status}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
