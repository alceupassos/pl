export function ProbabilityBar({ value, cor }: { value: number; cor: string }) {
  return (
    <div className="w-prob-bar">
      <div
        className="w-prob-fill"
        style={{ width: `${Math.round(value * 100)}%`, background: cor }}
      />
    </div>
  );
}
