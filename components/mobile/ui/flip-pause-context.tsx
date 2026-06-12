"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Ctx = { paused: boolean; setChildPaused: (v: boolean) => void };

const FlipPauseContext = createContext<Ctx | null>(null);

export function FlipPauseProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const setChildPaused = useCallback((v: boolean) => setPaused(v), []);
  const value = useMemo(() => ({ paused, setChildPaused }), [paused, setChildPaused]);
  return <FlipPauseContext.Provider value={value}>{children}</FlipPauseContext.Provider>;
}

export function useFlipPause() {
  return useContext(FlipPauseContext);
}
