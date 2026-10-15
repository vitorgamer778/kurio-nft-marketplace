// Transport uses decimal strings. All arithmetic uses integer wei, never floats.
export function wei(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) throw new Error("Valor ETH inválido");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}
export function eth(value: bigint): string {
  const fraction = (value % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return (value / 10n ** 18n).toString() + (fraction ? "." + fraction : ".00");
}
export const multiply = (price: string, quantity: number) =>
  eth(wei(price) * BigInt(quantity));
