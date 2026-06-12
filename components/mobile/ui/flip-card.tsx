"use client";

// Card que vira em 3D ao tocar (front ↔ back). Com `autoFlipMs`, alterna
// automaticamente no eixo vertical (rotateX); toque manual usa eixo horizontal (rotateY).

import { useEffect, useRef, useState, type ReactNode } from "react";

import { CountdownBar } from "@/components/mobile/ui/countdown-bar";
import { useFlipPause } from "@/components/mobile/ui/flip-pause-context";

export function FlipCard({
  front,
  back,
  autoFlipMs,
  ariaLabel = "Tocar para ver explicação",
}: {
  front: ReactNode;
  back: ReactNode;
  /** Alternância automática frente↔verso (flip vertical). */
  autoFlipMs?: number;
  ariaLabel?: string;
}) {
  const pauseCtx = useFlipPause();
  const [virado, setVirado] = useState(false);
  const [eixoX, setEixoX] = useState(false);
  const [pausadoManual, setPausadoManual] = useState(false);
  const [ciclo, setCiclo] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pausado = pausadoManual || pauseCtx?.paused === true;

  const reiniciarCiclo = () => setCiclo((c) => c + 1);

  const agendarAuto = () => {
    if (!autoFlipMs || pausado || virado) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setEixoX(true);
      setVirado((v) => !v);
      reiniciarCiclo();
    }, autoFlipMs);
  };

  useEffect(() => {
    agendarAuto();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ciclo reinicia o timer
  }, [autoFlipMs, pausado, virado, ciclo]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPausadoManual(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    pauseCtx?.setChildPaused(pausadoManual && virado);
    return () => pauseCtx?.setChildPaused(false);
  }, [pausadoManual, virado, pauseCtx]);

  const abrirManual = () => {
    setPausadoManual(true);
    setEixoX(false);
    setVirado(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const voltar = () => {
    setVirado(false);
    setPausadoManual(false);
    setEixoX(false);
    reiniciarCiclo();
  };

  return (
    <div className="m-flip-wrap">
      <div
        className={`m-flip${virado ? " virado" : ""}${eixoX ? " eixo-x" : ""}`}
        data-no-swipe
      >
        <div className="m-flip-inner">
          <div
            className="m-flip-face m-flip-front"
            onClick={abrirManual}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                abrirManual();
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={virado}
            aria-label={ariaLabel}
          >
            {front}
          </div>
          <div className="m-flip-face m-flip-back" aria-hidden={!virado}>
            {back}
            <button
              type="button"
              className="m-flip-voltar"
              onClick={(e) => {
                e.stopPropagation();
                voltar();
              }}
            >
              ‹ voltar
            </button>
          </div>
        </div>
      </div>
      {autoFlipMs ? <CountdownBar ms={autoFlipMs} cycleKey={ciclo} /> : null}
    </div>
  );
}
