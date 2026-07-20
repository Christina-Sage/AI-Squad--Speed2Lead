/** Shared currency formatting for the Work-it surface (route + in-page view). */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
