export function round(num: number) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
