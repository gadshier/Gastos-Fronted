import { useMemo, useState, useEffect } from 'react'
import { fechaParaInput } from '../utils/formatters'

function crearFormularioInicial(initialData) {
  if (!initialData) {
    return {
      descripcion: '',
      monto: '',
      fecha: '',
      categoria: '',
    }
  }

  return {
    descripcion: initialData.descripcion ?? '',
    monto: String(initialData.monto ?? ''),
    fecha: fechaParaInput(initialData.fecha),
    categoria: initialData.categoria ?? '',
  }
}

function GastoForm({ initialData, onSubmit, onCancel, isSaving, mode = 'create' }) {
  const [form, setForm] = useState(() => crearFormularioInicial(initialData))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(crearFormularioInicial(initialData))
  }, [initialData])

  const isEditing = mode === 'edit'
  const title = useMemo(() => (isEditing ? 'Editando gasto' : 'Nuevo gasto'), [isEditing])
  const helperText = isEditing
    ? 'Verifica los datos actuales y guarda los cambios del gasto seleccionado.'
    : 'Completa la información para guardar un nuevo gasto.'
  const submitLabel = isEditing ? 'Guardar cambios' : 'Guardar gasto'
  const editingName = initialData?.descripcion || 'Gasto seleccionado'

  function validar(campos) {
    const nextErrors = {}

    if (!campos.descripcion.trim()) {
      nextErrors.descripcion = 'La descripción es obligatoria.'
    }

    const monto = Number(campos.monto)
    if (!campos.monto || Number.isNaN(monto) || monto <= 0) {
      nextErrors.monto = 'Ingresa un monto mayor a 0.'
    }

    if (!campos.fecha) {
      nextErrors.fecha = 'Selecciona una fecha válida.'
    }

    if (!campos.categoria.trim()) {
      nextErrors.categoria = 'La categoría es obligatoria.'
    }

    return nextErrors
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validar(form)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    await onSubmit({
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto),
      fecha: form.fecha,
      categoria: form.categoria.trim(),
    })
  }

  return (
    <form className={`gasto-form card ${isEditing ? 'is-editing' : 'is-creating'}`} onSubmit={handleSubmit} noValidate>
      <div className="form-header">
        <h2>{title}</h2>
        <p>{helperText}</p>
      </div>
      {isEditing ? (
        <div className="editing-context" role="status" aria-live="polite">
          <p className="editing-context-label">Editar:</p>
          <p className="editing-context-title">{editingName}</p>
        </div>
      ) : null}

      <label>
        Descripción
        <input
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          placeholder="Ej. Compra del súper"
        />
        {errors.descripcion ? <span className="field-error">{errors.descripcion}</span> : null}
      </label>

      <div className="form-grid">
        <label>
          Monto
          <input
            type="number"
            step="0.01"
            min="0"
            name="monto"
            value={form.monto}
            onChange={handleChange}
            placeholder="0.00"
          />
          {errors.monto ? <span className="field-error">{errors.monto}</span> : null}
        </label>

        <label>
          Fecha
          <input type="date" name="fecha" value={form.fecha} onChange={handleChange} />
          {errors.fecha ? <span className="field-error">{errors.fecha}</span> : null}
        </label>
      </div>

      <label>
        Categoría
        <input
          name="categoria"
          value={form.categoria}
          onChange={handleChange}
          placeholder="Ej. Alimentación"
        />
        {errors.categoria ? <span className="field-error">{errors.categoria}</span> : null}
      </label>

      <div className="form-actions">
        {onCancel ? (
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" className={`btn ${isEditing ? 'warning' : 'primary'}`} disabled={isSaving}>
          {isSaving ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default GastoForm
