export function formatNaira(amount: number | string) {
  const value = Number(amount || 0)

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(value)
}