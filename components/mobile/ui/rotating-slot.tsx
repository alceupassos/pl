"use client";

// Alterna entre N cards com flip horizontal (rotateY) a cada `intervalMs`.

import { useEffect, useRef, useState, type ReactNode } from "react";

import { CountdownBar } from "@/components/mobile/ui/countdown-bar";
import { FlipPauseProvider, useFlipPause } from "@/components/mobile/ui/flip-pause-context";

function RotatingSlotInner({
  cards,
  intervalMs,
}: {
  cards: ReactNode[];
  intervalMs: number;
}) {
  const pauseCtx = useFlipPause();
  const [index, setIndex] = useState(0);
  const [virado, setVirado] = useState(false);
  const [ciclo, setCiclo] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = cards.length;

  const pausado = pauseCtx?.paused === true;

  const agendar = () => {
    if (n < 2 || pausado) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVirado(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % n);
        setVirado(false);
        setCiclo((c) => c + 1);
      }, 300);
    }, intervalMs);
  };

  useEffect(() => {
    agendar();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, pausado, index, ciclo, n]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && timerRef.current) clearTimeout(timerRef.current);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (n === 0) return null;
  if (n === 1) return <div className="m-rotate-slot">{cards[0]}</div>;

  const next = (index + 1) % n;

  return (
    <div className="m-rotate-slot">
      <div className={`m-rotate${virado ? " virado" : ""}`}>
        <div className="m-rotate-inner">
          <div className="m-rotate-face m-rotate-front">{cards[index]}</div>
          <div className="m-rotate-face m-rotate-back">{cards[next]}</div>
        </div>
      </div>
      <CountdownBar ms={intervalMs} cycleKey={ciclo} />
    </div>
  );
}

export function RotatingSlot({
  cards,
  intervalMs = 10_000,
}: {
  cards: ReactNode[];
  intervalMs?: number;
}) {
  return (
    <FlipPauseProvider>
      <RotatingSlotInner cards={cards} intervalMs={intervalMs} />
    </FlipPauseProvider>
  );
}
