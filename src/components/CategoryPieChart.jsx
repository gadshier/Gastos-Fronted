import { useMemo, useState } from 'react'
import { formatearMoneda } from '../utils/formatters'

const CHART_COLORS = ['#4f46e5', '#7c3aed', '#0ea5e9', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#10b981']

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function buildArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function CategoryPieChart({ data = [], loading = false, error = '' }) {
  const [activeIndex, setActiveIndex] = useState(null)

  const normalizedData = useMemo(() => (
    data.map((item, index) => ({
      ...item,
      color: CHART_COLORS[index % CHART_COLORS.length],
      porcentaje: Number(item.porcentaje ?? 0),
      total: Number(item.total ?? 0),
    }))
  ), [data])

  const totalGeneral = useMemo(
    () => normalizedData.reduce((acc, current) => acc + current.total, 0),
    [normalizedData],
  )

  const chartSegments = useMemo(() => {
    const result = normalizedData.reduce((acc, item) => {
      const sweep = (item.porcentaje / 100) * 360
      const startAngle = acc.currentAngle
      const endAngle = startAngle + sweep

      acc.segments.push({
        ...item,
        startAngle,
        endAngle,
        path: buildArcPath(120, 120, 96, startAngle, endAngle),
      })
      return { currentAngle: endAngle, segments: acc.segments }
    }, { currentAngle: 0, segments: [] })

    return result.segments
  }, [normalizedData])

  const activeItem = activeIndex !== null ? normalizedData[activeIndex] : null

  if (loading) {
    return <p className="chart-feedback">Cargando gráfico de categorías...</p>
  }

  if (error) {
    return <p className="chart-feedback error">No se pudo cargar el análisis por categoría: {error}</p>
  }

  if (normalizedData.length === 0) {
    return <p className="chart-feedback">No hay datos para mostrar.</p>
  }

  return (
    <div className="category-chart-layout">
      <div className="pie-graphic" role="img" aria-label="Distribución de gastos por categoría">
        <svg viewBox="0 0 240 240" className="pie-svg">
          {chartSegments.map((segment, index) => (
            <path
              key={segment.categoriaId ?? segment.nombreCategoria}
              d={segment.path}
              fill={segment.color}
              className={activeIndex === index ? 'is-active' : ''}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
          <circle cx="120" cy="120" r="58" fill="#fff" />
          <text x="120" y="114" textAnchor="middle" className="pie-total-label">Total</text>
          <text x="120" y="136" textAnchor="middle" className="pie-total-value">{formatearMoneda(totalGeneral)}</text>
        </svg>

        <div className="pie-tooltip" role="status" aria-live="polite">
          {activeItem
            ? `${activeItem.nombreCategoria}: ${formatearMoneda(activeItem.total)} (${activeItem.porcentaje.toFixed(2)}%)`
            : 'Pasa el cursor sobre una categoría para ver detalle.'}
        </div>
      </div>

      <ul className="pie-legend" aria-label="Leyenda de categorías">
        {normalizedData.map((item, index) => (
          <li key={item.categoriaId ?? `${item.nombreCategoria}-${index}`}>
            <span className="legend-color" style={{ backgroundColor: item.color }} />
            <div>
              <p>{item.nombreCategoria}</p>
              <small>{formatearMoneda(item.total)} · {item.porcentaje.toFixed(2)}%</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CategoryPieChart
