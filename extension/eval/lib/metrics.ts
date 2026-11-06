export interface Confusion {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface Metrics extends Confusion {
  n: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  f1: number;
  accuracy: number;
}

export function emptyConfusion(): Confusion {
  return { tp: 0, fp: 0, tn: 0, fn: 0 };
}

export function addOutcome(c: Confusion, actualPositive: boolean, predictedPositive: boolean): void {
  if (actualPositive && predictedPositive) c.tp++;
  else if (actualPositive) c.fn++;
  else if (predictedPositive) c.fp++;
  else c.tn++;
}

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function computeMetrics(c: Confusion): Metrics {
  const precision = safeDiv(c.tp, c.tp + c.fp);
  const recall = safeDiv(c.tp, c.tp + c.fn);
  const n = c.tp + c.fp + c.tn + c.fn;
  return {
    ...c,
    n,
    precision,
    recall,
    falsePositiveRate: safeDiv(c.fp, c.fp + c.tn),
    f1: safeDiv(2 * precision * recall, precision + recall),
    accuracy: safeDiv(c.tp + c.tn, n),
  };
}

/** Wilson score 95% interval for a proportion k/n. */
export function wilson95(k: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.959963984540054;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(centre - margin) / denom, (centre + margin) / denom];
}

export const pct = (x: number, digits = 1) => `${(100 * x).toFixed(digits)}%`;
