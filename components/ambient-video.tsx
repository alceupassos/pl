"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** One small responsive source; poster on reduced-motion or data-saving devices. */
export function AmbientVideo({ className = "" }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<string>();
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 700px)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () => {
      if (motion.matches || connection?.saveData) { videoRef.current?.pause(); setSource(undefined); return; }
      setSource(`/brand/strategy-${mobile.matches ? "mobile" : "desktop"}.mp4`);
    };
    update();
    motion.addEventListener("change", update);
    mobile.addEventListener("change", update);
    return () => { motion.removeEventListener("change", update); mobile.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && document.visibilityState === "visible") void video.play().catch(() => {});
      else video.pause();
    });
    const onVisibility = () => { if (document.visibilityState === "hidden") video.pause(); };
    observer.observe(video);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [source]);
  return <div className={`ambient-video ${className}`}>
    <video ref={videoRef} src={source} poster="/brand/strategy-room.webp" muted loop playsInline preload="none" aria-label="Animação ilustrativa de uma sala de acompanhamento" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    {source && <button type="button" className="ambient-video-control" aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"} onClick={() => { const video = videoRef.current; if (video?.paused) void video.play().catch(() => {}); else video?.pause(); }}>{playing ? <Pause size={16} /> : <Play size={16} />}<span>{playing ? "Pausar" : "Reproduzir"}</span></button>}
  </div>;
}
