"use client";

// Monta o EChart só quando o wrapper entra no viewport (e desmonta quando sai,
// liberando o canvas via dispose no unmount do EChart). A altura do wrapper é
// fixa SEMPRE — zero layout shift ao montar/desmontar.

import { useEffect, useRef, useState } from "react";

import { EChart } from "@/components/echart";

export function LazyChart(props: {
  option: Record<string, unknown>;
  height: number;
  className?: string;
  rootMargin?: string;
}) {
  const { option, height, className, rootMargin = "240px" } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // setState no callback do observer é assíncrono — permitido pelo lint.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
          } else if (entry.intersectionRatio === 0) {
            setVisible(false);
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={wrapRef} data-no-swipe style={{ width: "100%", height }}>
      {visible ? (
        <EChart option={option} height={height} className={className} />
      ) : (
        <div style={{ width: "100%", height }} />
      )}
    </div>
  );
}
