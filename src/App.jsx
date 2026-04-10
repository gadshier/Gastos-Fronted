import { useEffect, useMemo, useState } from 'react'
import './App.css'
import ConfirmDialog from './components/ConfirmDialog'
import FeedbackToast from './components/FeedbackToast'
import GastoForm from './components/GastoForm'
import GastosTable from './components/GastosTable'
import MetricCard from './components/MetricCard'
import {
  API_BASE_URL,
  actualizarGasto,
  crearGasto,
  eliminarGasto,
  obtenerCategorias,
  obtenerGastos,
} from './services/gastosApi'
import { formatearMoneda } from './utils/formatters'

const FILTROS_INICIALES = {
  mes: '',
  fechaDesde: '',
  fechaHasta: '',
  categoriaId: '',
  montoMin: '',
  montoMax: '',
  texto: '',
  ordenarPor: 'fecha',
  direccion: 'desc',
}

function formatearFechaISO(date) {
  return date.toISOString().split('T')[0]
}

function obtenerRangoDeMes(mes) {
  if (!mes) return { inicio: '', fin: '' }

  const [year, month] = mes.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, 1))
  const fin = new Date(Date.UTC(year, month, 0))

  return {
    inicio: formatearFechaISO(inicio),
    fin: formatearFechaISO(fin),
  }
}

function construirParametrosFiltro(filtros) {
  const parametros = {
    categoriaId: filtros.categoriaId || undefined,
    montoMin: filtros.montoMin || undefined,
    montoMax: filtros.montoMax || undefined,
    texto: filtros.texto.trim() || undefined,
    ordenarPor: filtros.ordenarPor || 'fecha',
    direccion: filtros.direccion || 'desc',
  }

  let fechaDesde = filtros.fechaDesde
  let fechaHasta = filtros.fechaHasta

  if (filtros.mes) {
    const rangoMes = obtenerRangoDeMes(filtros.mes)
    fechaDesde = fechaDesde || rangoMes.inicio
    fechaHasta = fechaHasta || rangoMes.fin
  }

  if (fechaDesde) parametros.fechaDesde = fechaDesde
  if (fechaHasta) parametros.fechaHasta = fechaHasta

  return parametros
}

function App() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [categoriasLoading, setCategoriasLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [editando, setEditando] = useState(null)
  const [pendienteEliminar, setPendienteEliminar] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES)

  async function cargarCategorias() {
    try {
      setCategoriasLoading(true)
      const data = await obtenerCategorias()
      setCategorias((data ?? []).filter((categoria) => categoria.activo !== false))
    } catch (requestError) {
      setToast({ message: `No se pudieron cargar las categorías: ${requestError.message}`, type: 'error' })
    } finally {
      setCategoriasLoading(false)
    }
  }

  async function cargarGastos(filtrosBusqueda = FILTROS_INICIALES) {
    try {
      setLoading(true)
      setError('')
      const parametros = construirParametrosFiltro(filtrosBusqueda)
      const data = await obtenerGastos(parametros)
      setGastos(data ?? [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  useEffect(() => {
    cargarGastos(filtrosAplicados)
  }, [filtrosAplicados])

  useEffect(() => {
    if (!toast.message) return undefined

    const timeout = setTimeout(() => {
      setToast({ message: '', type: 'success' })
    }, 3200)

    return () => clearTimeout(timeout)
  }, [toast.message])

  const metricas = useMemo(() => {
    const total = gastos.reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0)

    const categoriasPorUso = gastos.reduce((acc, gasto) => {
      const categoria = gasto.nombreCategoria || 'Sin categoría'
      acc[categoria] = (acc[categoria] ?? 0) + 1
      return acc
    }, {})

    const categoriaTop = Object.entries(categoriasPorUso).sort((a, b) => b[1] - a[1])[0]

    return {
      total,
      cantidad: gastos.length,
      categoriaTop: categoriaTop
        ? `${categoriaTop[0]} (${categoriaTop[1]})`
        : 'Sin datos disponibles',
    }
  }, [gastos])

  const filtrosActivos = useMemo(() => {
    const chips = []
    const categoriaActiva = categorias.find((categoria) => String(categoria.id) === String(filtrosAplicados.categoriaId))

    if (filtrosAplicados.mes) chips.push(`Mes: ${filtrosAplicados.mes}`)
    if (filtrosAplicados.fechaDesde) chips.push(`Desde: ${filtrosAplicados.fechaDesde}`)
    if (filtrosAplicados.fechaHasta) chips.push(`Hasta: ${filtrosAplicados.fechaHasta}`)
    if (filtrosAplicados.categoriaId) chips.push(`Categoría: ${categoriaActiva?.nombre ?? filtrosAplicados.categoriaId}`)
    if (filtrosAplicados.montoMin) chips.push(`Monto mín: ${filtrosAplicados.montoMin}`)
    if (filtrosAplicados.montoMax) chips.push(`Monto máx: ${filtrosAplicados.montoMax}`)
    if (filtrosAplicados.texto.trim()) chips.push(`Texto: “${filtrosAplicados.texto.trim()}”`)
    if (filtrosAplicados.ordenarPor !== FILTROS_INICIALES.ordenarPor || filtrosAplicados.direccion !== FILTROS_INICIALES.direccion) {
      chips.push(`Orden: ${filtrosAplicados.ordenarPor} (${filtrosAplicados.direccion})`)
    }

    return chips
  }, [categorias, filtrosAplicados])

  const hayFiltrosActivos = filtrosActivos.length > 0

  function actualizarFiltro(event) {
    const { name, value } = event.target
    setFiltros((prev) => ({ ...prev, [name]: value }))
  }

  function aplicarFiltros(nextFiltros = filtros) {
    const montoMin = Number(nextFiltros.montoMin)
    const montoMax = Number(nextFiltros.montoMax)

    if (nextFiltros.montoMin && nextFiltros.montoMax && montoMin > montoMax) {
      setToast({ message: 'El monto mínimo no puede ser mayor al monto máximo.', type: 'error' })
      return
    }

    if (nextFiltros.fechaDesde && nextFiltros.fechaHasta && nextFiltros.fechaDesde > nextFiltros.fechaHasta) {
      setToast({ message: 'La fecha desde no puede ser mayor que la fecha hasta.', type: 'error' })
      return
    }

    setFiltrosAplicados({ ...nextFiltros, texto: nextFiltros.texto.trimStart() })
  }

  function handleSubmitFiltros(event) {
    event.preventDefault()
    aplicarFiltros(filtros)
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES)
    setFiltrosAplicados(FILTROS_INICIALES)
  }

  function aplicarEsteMes() {
    const hoy = new Date()
    const mes = `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, '0')}`
    const nextFiltros = { ...filtros, mes, fechaDesde: '', fechaHasta: '' }
    setFiltros(nextFiltros)
    aplicarFiltros(nextFiltros)
  }

  function aplicarUltimos30Dias() {
    const hoy = new Date()
    const desde = new Date()
    desde.setUTCDate(hoy.getUTCDate() - 30)

    const nextFiltros = {
      ...filtros,
      mes: '',
      fechaDesde: formatearFechaISO(desde),
      fechaHasta: formatearFechaISO(hoy),
    }

    setFiltros(nextFiltros)
    aplicarFiltros(nextFiltros)
  }

  async function handleCreateOrUpdate(payload) {
    try {
      setSaving(true)
      if (editando) {
        await actualizarGasto(editando.id, payload)
        setToast({ message: 'Gasto actualizado correctamente.', type: 'success' })
      } else {
        await crearGasto(payload)
        setToast({ message: 'Gasto creado correctamente.', type: 'success' })
      }

      setEditando(null)
      await cargarGastos(filtrosAplicados)
    } catch (requestError) {
      setToast({ message: requestError.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!pendienteEliminar) return

    try {
      setDeleting(true)
      await eliminarGasto(pendienteEliminar.id)
      setToast({ message: 'Gasto eliminado correctamente.', type: 'success' })
      setPendienteEliminar(null)
      await cargarGastos(filtrosAplicados)
    } catch (requestError) {
      setToast({ message: requestError.message, type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const gastoEnEdicionLabel = editando?.descripcion || editando?.nombreCategoria || `ID ${editando?.id ?? ''}`

  return (
    <main className="app-shell">
      <header className="header card">
        <div>
          <p className="eyebrow">Control de gastos</p>
          <h1>Dashboard financiero</h1>
          <p className="subtitle">
            Visualiza, crea y administra gastos con una experiencia limpia y escalable.
          </p>
        </div>
        <span className="api-chip">API: {API_BASE_URL}</span>
      </header>

      <section className="metrics-grid">
        <MetricCard
          title="Total de gastos"
          value={formatearMoneda(metricas.total)}
          helperText="Suma global del resultado filtrado"
          icon="💸"
          tone="pink"
        />
        <MetricCard
          title="Registros"
          value={metricas.cantidad}
          helperText="Gastos visibles actualmente"
          icon="📊"
          tone="blue"
        />
        <MetricCard
          title="Categoría más usada"
          value={metricas.categoriaTop}
          helperText="Calculado según filtros activos"
          icon="🏷️"
          tone="purple"
        />
      </section>

      <section className="card filters-panel">
        <div className="filters-header">
          <div>
            <p className="eyebrow">Explorar gastos</p>
            <h2>Filtros y búsqueda avanzada</h2>
          </div>
          <div className="quick-filters">
            <button type="button" className="btn secondary" onClick={aplicarEsteMes}>Este mes</button>
            <button type="button" className="btn secondary" onClick={aplicarUltimos30Dias}>Últimos 30 días</button>
          </div>
        </div>

        <form className="filters-grid" onSubmit={handleSubmitFiltros}>
          <label>
            Buscar por descripción
            <input
              name="texto"
              value={filtros.texto}
              onChange={actualizarFiltro}
              placeholder="Ej. supermercado, gasolina, farmacia"
            />
          </label>

          <label>
            Mes
            <input type="month" name="mes" value={filtros.mes} onChange={actualizarFiltro} />
          </label>

          <label>
            Fecha desde
            <input type="date" name="fechaDesde" value={filtros.fechaDesde} onChange={actualizarFiltro} />
          </label>

          <label>
            Fecha hasta
            <input type="date" name="fechaHasta" value={filtros.fechaHasta} onChange={actualizarFiltro} />
          </label>

          <label>
            Categoría
            <select
              name="categoriaId"
              value={filtros.categoriaId}
              onChange={actualizarFiltro}
              disabled={categoriasLoading}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Monto mínimo
            <input
              type="number"
              step="0.01"
              min="0"
              name="montoMin"
              value={filtros.montoMin}
              onChange={actualizarFiltro}
              placeholder="0.00"
            />
          </label>

          <label>
            Monto máximo
            <input
              type="number"
              step="0.01"
              min="0"
              name="montoMax"
              value={filtros.montoMax}
              onChange={actualizarFiltro}
              placeholder="0.00"
            />
          </label>

          <label>
            Ordenar por
            <select name="ordenarPor" value={filtros.ordenarPor} onChange={actualizarFiltro}>
              <option value="fecha">Fecha</option>
              <option value="monto">Monto</option>
            </select>
          </label>

          <label>
            Dirección
            <select name="direccion" value={filtros.direccion} onChange={actualizarFiltro}>
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </label>

          <div className="filters-actions">
            <button type="button" className="btn secondary" onClick={limpiarFiltros}>Limpiar filtros</button>
            <button type="submit" className="btn primary">Aplicar filtros</button>
          </div>
        </form>

        {hayFiltrosActivos ? (
          <div className="active-chips" role="status" aria-live="polite">
            {filtrosActivos.map((chip) => (
              <span key={chip} className="chip">{chip}</span>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="card error-banner">
          <strong>No se pudieron cargar los gastos.</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <section className="content-grid">
        <GastoForm
          key="nuevo"
          initialData={null}
          onSubmit={handleCreateOrUpdate}
          onCancel={null}
          isSaving={saving}
          categorias={categorias}
          categoriasLoading={categoriasLoading}
          mode="create"
        />

        <div>
          <div className="section-header">
            <h2>Listado de gastos</h2>
            <p>{hayFiltrosActivos ? 'Resultados según filtros seleccionados.' : 'Edita o elimina desde la tabla responsive.'}</p>
          </div>
          <GastosTable
            gastos={gastos}
            loading={loading}
            hasFilters={hayFiltrosActivos}
            onClearFilters={limpiarFiltros}
            onEdit={(gasto) => setEditando(gasto)}
            onDelete={(gasto) => setPendienteEliminar(gasto)}
          />
        </div>
      </section>

      {editando ? (
        <div
          className="modal-overlay edit-overlay"
          onClick={() => setEditando(null)}
          role="presentation"
        >
          <div className="card edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="edit-modal-header">
              <div>
                <p className="eyebrow">Modo edición</p>
                <h3>Editar: {gastoEnEdicionLabel}</h3>
              </div>
              <button
                type="button"
                className="btn secondary close-btn"
                onClick={() => setEditando(null)}
              >
                Cerrar
              </button>
            </div>
            <GastoForm
              key={editando?.id ?? 'edit'}
              initialData={editando}
              onSubmit={handleCreateOrUpdate}
              onCancel={() => setEditando(null)}
              isSaving={saving}
              categorias={categorias}
              categoriasLoading={categoriasLoading}
              mode="edit"
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendienteEliminar)}
        title="¿Eliminar gasto?"
        description={`Esta acción no se puede deshacer. Se eliminará "${pendienteEliminar?.descripcion ?? ''}".`}
        onConfirm={handleDelete}
        onCancel={() => setPendienteEliminar(null)}
        loading={deleting}
      />

      <FeedbackToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </main>
  )
}

export default App
