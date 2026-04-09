function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading }) {
  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal card">
        <h3 id="confirm-title">{title}</h3>
        <p>{description}</p>
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
