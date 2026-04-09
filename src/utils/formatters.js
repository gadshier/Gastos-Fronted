export function formatearMoneda(valor) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(Number(valor) || 0)
}

export function formatearFecha(valor) {
  if (!valor) return '-'
  const date = new Date(valor)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(date)
}

export function fechaParaInput(valor) {
  if (!valor) return ''
  const date = new Date(valor)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}
