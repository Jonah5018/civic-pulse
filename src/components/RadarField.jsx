/**
 * Purely decorative ambient backdrop — a scanning grid with a slow radar
 * sweep and a few drifting "blips". This is the signature visual motif of
 * CivicPulse: citizens as live points on a shared civic radar.
 */
export default function RadarField({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="grid-scan absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />

      <div className="absolute left-1/2 top-[-140px] h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-emerald/10">
        <div className="absolute inset-8 rounded-full border border-cyan/10" />
        <div className="absolute inset-16 rounded-full border border-emerald/10" />
        <div
          className="absolute inset-0 rounded-full animate-radar-spin"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, rgba(22,233,166,0.14) 20%, transparent 40%)",
            animationDuration: "8s",
          }}
        />
      </div>

      {[
        { top: "18%", left: "22%", delay: "0s", color: "bg-emerald" },
        { top: "32%", left: "78%", delay: "1.2s", color: "bg-cyan" },
        { top: "55%", left: "12%", delay: "2.1s", color: "bg-emerald" },
        { top: "12%", left: "60%", delay: "0.6s", color: "bg-cyan" },
      ].map((blip, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 animate-float rounded-full"
          style={{ top: blip.top, left: blip.left, animationDelay: blip.delay }}
        >
          <span className={`absolute inset-0 rounded-full ${blip.color}`} />
          <span className={`absolute inset-0 rounded-full ${blip.color} animate-pulse-ring`} />
        </span>
      ))}
    </div>
  );
}
