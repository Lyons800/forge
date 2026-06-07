export function shouldRollback(p: { baseline: number; canary: number; samples: number }): boolean {
  const MIN_SAMPLES = 100;
  const REL_THRESHOLD = 2; // canary must be >2x baseline
  if (p.samples < MIN_SAMPLES) return false;
  return p.canary > Math.max(p.baseline * REL_THRESHOLD, p.baseline + 0.02);
}
