import { formatearFecha, formatearMoneda } from '../utils/formatters'

function GastosTable({ gastos, onEdit, onDelete, loading }) {
  if (loading) {
    return <div className="card empty-state">Cargando gastos...</div>
  }

  if (gastos.length === 0) {
    return (
      <div className="card empty-state">
        <h3>Sin gastos registrados</h3>
        <p>Agrega tu primer gasto para comenzar a construir tu dashboard.</p>
      </div>
    )
  }

  return (
    <div className="card table-wrapper">
      <table className="gastos-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Categoría</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {gastos.map((gasto) => (
            <tr key={gasto.id}>
              <td data-label="Descripción">{gasto.Descripcion}</td>
              <td data-label="Monto" className="amount-cell">
                {formatearMoneda(gasto.Monto)}
              </td>
              <td data-label="Fecha">{formatearFecha(gasto.Fecha)}</td>
              <td data-label="Categoría">
                <span className="tag">{gasto.Categoria}</span>
              </td>
              <td data-label="Acciones">
                <div className="row-actions">
                  <button type="button" className="btn ghost" onClick={() => onEdit(gasto)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => onDelete(gasto)}
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default GastosTable
