function MetricCard({ title, value, icon, tone = 'default', helperText }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="metric-title">{title}</p>
        <p className="metric-value">{value}</p>
        {helperText ? <p className="metric-helper">{helperText}</p> : null}
      </div>
    </article>
  )
}

export default MetricCard
