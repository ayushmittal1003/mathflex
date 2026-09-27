"use client";
import { createContext, useCallback, useContext, useState } from "react";
import confetti from "canvas-confetti";

export type Celebration = {
  title: string;
  subtitle?: string;
  xp?: number;
  emoji?: string;
  badges?: { name: string; emoji: string; description: string }[];
  cta?: { label: string; href: string };
};

const Ctx = createContext<(c: Celebration) => void>(() => {});
export const useCelebrate = () => useContext(Ctx);

// A short major-arpeggio "ta-da", synthesized so there's no audio file to host.
function playChime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + (i === notes.length - 1 ? 0.9 : 0.3));
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

function burst() {
  const colors = ["#FF2E63", "#FF8A3D", "#FACC15", "#8B5CF6", "#22C55E"];
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 }, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true }), 180);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true }), 180);
}

export function CelebrateProvider({ children, sound }: { children: React.ReactNode; sound: boolean }) {
  const [current, setCurrent] = useState<Celebration | null>(null);
  const celebrate = useCallback(
    (c: Celebration) => {
      setCurrent(c);
      burst();
      if (sound) playChime();
    },
    [sound],
  );

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      {current && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCurrent(null)}>
          <div
            role="dialog"
            aria-modal
            className="card animate-pop w-full max-w-sm p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 grid size-20 place-items-center rounded-full bg-brand-gradient text-4xl shadow-lg">
              {current.emoji ?? "🎉"}
            </div>
            <h2 className="font-display text-2xl font-extrabold">{current.title}</h2>
            {current.subtitle && <p className="mt-1 text-muted">{current.subtitle}</p>}
            {!!current.xp && (
              <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-xp/15 px-4 py-1.5 font-bold text-xp">+{current.xp} XP</p>
            )}
            {!!current.badges?.length && (
              <div className="mt-5 space-y-2">
                {current.badges.map((b) => (
                  <div key={b.name} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left">
                    <span className="text-3xl">{b.emoji}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gold">New badge</p>
                      <p className="font-bold">{b.name}</p>
                      <p className="text-xs text-muted">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2">
              {current.cta && (
                <a href={current.cta.href} className="btn btn-primary">
                  {current.cta.label}
                </a>
              )}
              <button className="btn btn-ghost" onClick={() => setCurrent(null)}>
                {current.cta ? "Later" : "Let's go!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
