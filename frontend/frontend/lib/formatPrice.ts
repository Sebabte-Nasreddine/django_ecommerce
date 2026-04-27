/** Format monétaire en Dirham marocain. */
export function formatEuro(value: number | string): string {
    const n = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(n)) return '0,00 DH'
    return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`
}
