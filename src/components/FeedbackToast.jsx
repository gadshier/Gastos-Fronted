function FeedbackToast({ message, type = 'success', onClose }) {
  if (!message) return null

  return (
    <div className={`toast ${type}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar notificación">
        ×
      </button>
    </div>
  )
}

export default FeedbackToast
