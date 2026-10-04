"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, UserRound } from "lucide-react";
import type { PerfilCandidato } from "@/lib/telao/candidato-push";
import type { PleitoId } from "@/lib/telao/tse-apuracao";
import { UF_NOME, UFS } from "@/lib/telao/ufs";

type Form = { nome: string; email: string; whatsapp: string; numero: string; cargo: PleitoId; uf: string; territorio: string };
const cargos: { value: PleitoId; label: string }[] = [
  { value: "dep-federal-sp", label: "Deputado Federal" }, { value: "dep-estadual-sp", label: "Deputado Estadual / Distrital" },
  { value: "governador-sp", label: "Governador" }, { value: "senador-sp", label: "Senador" }, { value: "presidente", label: "Presidente" },
];
const formatPhone = (value: string) => value.replace(/\D/g, "").slice(0, 13);
export function AtivacaoCandidatoModal({ onClose, onSaved, initialUf = "sp", required = false }: {
  onClose: () => void; onSaved?: (p: PerfilCandidato) => void; initialUf?: string; required?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeToday, setActiveToday] = useState(false);
  const [step, setStep] = useState<"contact" | "candidate" | "review">("contact");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const [form, setForm] = useState<Form>({ nome: "", email: "", whatsapp: "", numero: "", cargo: "dep-federal-sp", uf: initialUf, territorio: "" });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/candidato/perfil", { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((data) => {
      const p: PerfilCandidato | undefined = data?.perfil;
      if (p) {
        setForm({ nome: p.nome || "", email: p.email || "", whatsapp: p.whatsapp || "", numero: p.numero ? String(p.numero) : "", cargo: p.cargo || "dep-federal-sp", uf: p.uf || initialUf, territorio: p.territorio || "" });
        if (p.nome && p.email && p.whatsapp && p.numero) setStep("review");
      }
      setActiveToday(!!data?.ativadoHoje);
    }).catch((e) => { if (e.name !== "AbortError") setError("Não foi possível carregar os dados salvos. Você pode preencher o cadastro abaixo."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [initialUf]);
  useEffect(() => {
    if (loading) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.querySelector<HTMLElement>("input, button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !required && !saving) { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('input,select,textarea,button')).filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); if (previous?.isConnected) previous.focus(); };
  }, [loading, step, required, saving]);
  const update = (key: keyof Form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (step === "contact") {
      if (form.whatsapp.replace(/\D/g, "").length < 10) { setError("Informe o WhatsApp com DDD. Exemplo: 21 99999-9999."); return; }
      setStep("candidate"); return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/candidato/perfil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, whatsapp: formatPhone(form.whatsapp), numero: Number(form.numero) }), signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) { setError(response.status === 401 ? "Sua sessão expirou. Entre novamente para salvar." : "Confira os campos e tente salvar novamente."); return; }
      setSaved(true); setActiveToday(true); onSaved?.(data.perfil); onClose();
    } catch { setError("Não foi possível salvar agora. Seus dados continuam preenchidos; tente novamente."); }
    finally { setSaving(false); }
  };
  return <div className="pl-dest-ov" role="dialog" aria-modal="true" aria-labelledby="candidate-profile-title">
    <div className="pl-dest-box pl-atv-box" ref={dialogRef}>
      <h2 id="candidate-profile-title">{step === "review" ? "Pronto para acompanhar." : "Seu cadastro, em poucos passos."}</h2>
      <p>{step === "review" ? "Seus dados já estão salvos. Confirme para ativar o acompanhamento de hoje." : "Preencha uma vez. Nos próximos acessos, basta confirmar os dados salvos."}</p>
      {loading ? <p role="status">Carregando seu cadastro…</p> : <form onSubmit={submit} className="pl-atv-form">
        {step !== "review" && <div className="pl-profile-steps" aria-label="Progresso do cadastro"><span className={step === "contact" ? "on" : ""}>1. Contato</span><ArrowRight size={16} /><span className={step === "candidate" ? "on" : ""}>2. Candidatura</span></div>}
        {step === "contact" && <>
          <label><span>Nome do candidato</span><input name="name" autoComplete="name" required maxLength={60} value={form.nome} onChange={(e) => update("nome", e.target.value)} placeholder="Como aparece na urna" /></label>
          <label><span>E-mail</span><input name="email" type="email" autoComplete="email" required maxLength={80} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="voce@exemplo.com" /></label>
          <label><span>WhatsApp com DDD</span><input name="tel" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="(21) 99999-9999" /><small>Usado para os alertas de acompanhamento.</small></label>
        </>}
        {step === "candidate" && <>
          <label><span>Cargo</span><select value={form.cargo} onChange={(e) => update("cargo", e.target.value)}>{cargos.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          <div className="pl-atv-row"><label><span>Número na urna</span><input type="text" inputMode="numeric" required pattern="[0-9]{2,5}" maxLength={5} value={form.numero} onChange={(e) => update("numero", e.target.value.replace(/\D/g, ""))} placeholder="Ex.: 22100" /></label><label><span>Estado</span><select value={form.uf} onChange={(e) => update("uf", e.target.value)}>{[...UFS].sort((a,b) => UF_NOME[a].localeCompare(UF_NOME[b], "pt-BR")).map((u) => <option key={u} value={u}>{UF_NOME[u]}</option>)}</select></label></div>
          <details className="pl-profile-optional"><summary>Adicionar locais de atuação (opcional)</summary><label><span>Cidades ou bairros</span><textarea rows={2} maxLength={200} value={form.territorio} onChange={(e) => update("territorio", e.target.value)} placeholder="Ex.: Centro, Campo Grande, Bangu" /></label></details>
        </>}
        {step === "review" && <div className="pl-profile-summary"><UserRound size={24} /><div><strong>{form.nome}</strong><span>{cargos.find((c) => c.value === form.cargo)?.label} · {form.numero} · {UF_NOME[form.uf] || form.uf.toUpperCase()}</span><span>{form.email}</span><span>WhatsApp: {form.whatsapp}</span></div><button type="button" onClick={() => setStep("contact")}>Editar</button></div>}
        {error && <p className="pl-profile-error" role="alert">{error}</p>}
        {saved && <p role="status"><Check size={16} /> Cadastro confirmado.</p>}
        <div className="pl-dest-act">
          {step === "candidate" ? <button type="button" className="pl-ed-del" disabled={saving} onClick={() => setStep("contact")}><ArrowLeft size={16} /> Voltar</button> : !required && <button type="button" className="pl-ed-del" disabled={saving} onClick={onClose}>Fechar</button>}
          <button type="submit" className="pl-ed-save" disabled={saving}>{saving ? "Salvando…" : step === "contact" ? "Continuar" : activeToday ? "Confirmar dados" : "Ativar para hoje"} {!saving && <ArrowRight size={16} />}</button>
        </div>
      </form>}
    </div>
  </div>;
}
