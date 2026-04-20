import { useMemo, useState } from 'react'
import { formatearMoneda } from '../utils/formatters'

function MonthlyTrendChart({ data, loading }) {
  const [tooltip, setTooltip] = useState(null)

  const chartGeometry = useMemo(() => {
    const width = 820
    const height = 320
    const padding = { top: 24, right: 28, bottom: 44, left: 74 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    const maxValue = Math.max(...data.map((item) => item.total), 0)
    const safeMax = maxValue === 0 ? 1 : maxValue

    const points = data.map((item, index) => {
      const x = padding.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth)
      const y = padding.top + plotHeight - (item.total / safeMax) * plotHeight
      return { ...item, x, y }
    })

    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    const yTicks = 4
    const ticks = Array.from({ length: yTicks + 1 }).map((_, index) => {
      const value = safeMax * ((yTicks - index) / yTicks)
      const y = padding.top + (index / yTicks) * plotHeight
      return { value, y }
    })

    return {
      width,
      height,
      padding,
      points,
      path,
      ticks,
    }
  }, [data])

  if (loading) {
    return <p className="chart-feedback">Cargando comparativo mensual...</p>
  }

  if (!data.length) {
    return <p className="chart-feedback">No hay datos para construir la línea de tiempo con los filtros actuales.</p>
  }

  return (
    <div className="monthly-chart">
      <div className="monthly-chart-canvas">
        <svg
          viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
          role="img"
          aria-label="Línea de tiempo de gastos mensuales"
        >
          {chartGeometry.ticks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={chartGeometry.padding.left}
                y1={tick.y}
                x2={chartGeometry.width - chartGeometry.padding.right}
                y2={tick.y}
                className="monthly-chart-grid"
              />
              <text x={18} y={tick.y + 4} className="monthly-chart-tick-label">
                {formatearMoneda(tick.value)}
              </text>
            </g>
          ))}

          <path d={chartGeometry.path} className="monthly-chart-line" />

          {chartGeometry.points.map((point) => (
            <g key={point.value}>
              <circle
                cx={point.x}
                cy={point.y}
                r={6}
                className="monthly-chart-point"
                onMouseEnter={(event) => {
                  const bounds = event.currentTarget.closest('.monthly-chart-canvas')?.getBoundingClientRect()
                  if (!bounds) return
                  setTooltip({
                    left: event.clientX - bounds.left,
                    top: event.clientY - bounds.top,
                    label: point.label,
                    total: point.total,
                    variacion: point.variationPct,
                  })
                }}
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.closest('.monthly-chart-canvas')?.getBoundingClientRect()
                  if (!bounds) return
                  setTooltip((prev) => (prev
                    ? { ...prev, left: event.clientX - bounds.left, top: event.clientY - bounds.top }
                    : prev))
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            </g>
          ))}

          {chartGeometry.points.map((point) => (
            <text
              key={`${point.value}-label`}
              x={point.x}
              y={chartGeometry.height - 14}
              textAnchor="middle"
              className="monthly-chart-x-label"
            >
              {point.shortLabel}
            </text>
          ))}
        </svg>

        {tooltip ? (
          <div className="monthly-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
            <strong>{tooltip.label}</strong>
            <span>Total: {formatearMoneda(tooltip.total)}</span>
            <span>
              Variación:{' '}
              {tooltip.variacion == null ? '—' : `${tooltip.variacion >= 0 ? '+' : ''}${tooltip.variacion.toFixed(1)}%`}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MonthlyTrendChart
