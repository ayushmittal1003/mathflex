// Short "ding" / "bonk" feedback tones for answers.
export function tone(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = ok ? "sine" : "square";
    o.frequency.setValueAtTime(ok ? 880 : 180, ctx.currentTime);
    if (ok) o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}
