/**
 * Moving weighted average cost for supplies kept on a perpetual stock card. Each receipt
 * re-averages the unit cost of what is on hand; issues and count adjustments are valued at
 * the average in effect, so stock in the books always equals quantity × average cost.
 */

const toCentavos = (value: number | string | null | undefined) => Math.round(Number(value ?? 0) * 100);

/** Average unit cost after receiving `quantity` at `cost` into `onHand` units carried at `average` */
export function averageAfterReceipt(onHand: number, average: number | string, quantity: number, cost: number | string): string {
  const held = Math.max(onHand, 0);
  if (held + quantity <= 0) return (toCentavos(cost) / 100).toFixed(2);
  return (Math.round((held * toCentavos(average) + quantity * toCentavos(cost)) / (held + quantity)) / 100).toFixed(2);
}

/** Average unit cost after a receipt of `quantity` at `cost` is taken back out of `onHand` units */
export function averageAfterReceiptRemoved(onHand: number, average: number | string, quantity: number, cost: number | string): string {
  const remaining = onHand - quantity;
  if (remaining <= 0) return (toCentavos(average) / 100).toFixed(2);
  const value = onHand * toCentavos(average) - quantity * toCentavos(cost);
  return (Math.max(Math.round(value / remaining), 0) / 100).toFixed(2);
}
