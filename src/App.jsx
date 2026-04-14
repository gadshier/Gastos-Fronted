import { useEffect, useMemo, useState } from 'react'
import './App.css'
import CategoryPieChart from './components/CategoryPieChart'
import ConfirmDialog from './components/ConfirmDialog'
import FeedbackToast from './components/FeedbackToast'
import GastoForm from './components/GastoForm'
import GastosTable from './components/GastosTable'
import MetricCard from './components/MetricCard'
import {
  API_BASE_URL,
  actualizarGasto,
  crearCategoria,
  crearGasto,
  eliminarGasto,
  obtenerCategorias,
  obtenerGastos,
  obtenerResumenPorCategoria,
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
  return {
    categoriaId: filtros.categoriaId || undefined,
    fechaDesde: filtros.fechaDesde || undefined,
    fechaHasta: filtros.fechaHasta || undefined,
    montoMin: filtros.montoMin || undefined,
    montoMax: filtros.montoMax || undefined,
    texto: filtros.texto.trim() || undefined,
    ordenarPor: filtros.ordenarPor || 'fecha',
    direccion: filtros.direccion || 'desc',
  }
}

function etiquetaMes(mes) {
  if (!mes) return ''
  const [year, month] = mes.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(date)
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
  const [mostrarAvanzados, setMostrarAvanzados] = useState(false)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES)
  const [crearAbierto, setCrearAbierto] = useState(false)
  const [resumenCategorias, setResumenCategorias] = useState([])
  const [resumenLoading, setResumenLoading] = useState(true)
  const [resumenError, setResumenError] = useState('')
  const [crearCategoriaAbierto, setCrearCategoriaAbierto] = useState(false)
  const [categoriaNueva, setCategoriaNueva] = useState({
    nombre: '',
    descripcion: '',
    activo: true,
  })
  const [categoriaSaving, setCategoriaSaving] = useState(false)

  const opcionesMes = useMemo(() => {
    const hoy = new Date()
    return Array.from({ length: 18 }).map((_, index) => {
      const date = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - index, 1))
      const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      return { value, label: etiquetaMes(value) }
    })
  }, [])

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

  async function cargarResumenCategorias(filtrosBusqueda = FILTROS_INICIALES) {
    try {
      setResumenLoading(true)
      setResumenError('')
      const data = await obtenerResumenPorCategoria({
        fechaDesde: filtrosBusqueda.fechaDesde,
        fechaHasta: filtrosBusqueda.fechaHasta,
      })
      setResumenCategorias(data ?? [])
    } catch (requestError) {
      setResumenError(requestError.message)
      setResumenCategorias([])
    } finally {
      setResumenLoading(false)
    }
  }

  async function cargarGastos(filtrosBusqueda = FILTROS_INICIALES) {
    try {
      setLoading(true)
      setError('')
      const data = await obtenerGastos(construirParametrosFiltro(filtrosBusqueda))
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
    cargarResumenCategorias(filtrosAplicados)
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

    if (filtrosAplicados.mes) chips.push(`Mes: ${etiquetaMes(filtrosAplicados.mes)}`)
    if (filtrosAplicados.categoriaId) chips.push(`Categoría: ${categoriaActiva?.nombre ?? filtrosAplicados.categoriaId}`)
    if (filtrosAplicados.texto.trim()) chips.push(`Búsqueda: “${filtrosAplicados.texto.trim()}”`)
    if (filtrosAplicados.montoMin) chips.push(`Mín: ${filtrosAplicados.montoMin}`)
    if (filtrosAplicados.montoMax) chips.push(`Máx: ${filtrosAplicados.montoMax}`)
    if (filtrosAplicados.fechaDesde && !filtrosAplicados.mes) chips.push(`Desde: ${filtrosAplicados.fechaDesde}`)
    if (filtrosAplicados.fechaHasta && !filtrosAplicados.mes) chips.push(`Hasta: ${filtrosAplicados.fechaHasta}`)
    if (filtrosAplicados.ordenarPor !== FILTROS_INICIALES.ordenarPor || filtrosAplicados.direccion !== FILTROS_INICIALES.direccion) {
      chips.push(`Orden: ${filtrosAplicados.ordenarPor} (${filtrosAplicados.direccion})`)
    }

    return chips
  }, [categorias, filtrosAplicados])

  const hayFiltrosActivos = filtrosActivos.length > 0

  function actualizarFiltro(event) {
    const { name, value } = event.target

    setFiltros((prev) => {
      const next = { ...prev, [name]: value }

      if (name === 'mes') {
        if (!value) {
          next.fechaDesde = ''
          next.fechaHasta = ''
        } else {
          const rango = obtenerRangoDeMes(value)
          next.fechaDesde = rango.inicio
          next.fechaHasta = rango.fin
        }
      }

      if ((name === 'fechaDesde' || name === 'fechaHasta') && value) {
        next.mes = ''
      }

      return next
    })
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

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES)
    setFiltrosAplicados(FILTROS_INICIALES)
  }

  function aplicarEsteMes() {
    const hoy = new Date()
    const mes = `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, '0')}`
    const rango = obtenerRangoDeMes(mes)
    const nextFiltros = { ...filtros, mes, fechaDesde: rango.inicio, fechaHasta: rango.fin }
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
        setEditando(null)
      } else {
        await crearGasto(payload)
        setToast({ message: 'Gasto creado correctamente.', type: 'success' })
        setCrearAbierto(false)
      }
      await Promise.all([
        cargarGastos(filtrosAplicados),
        cargarResumenCategorias(filtrosAplicados),
      ])
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
      await Promise.all([
        cargarGastos(filtrosAplicados),
        cargarResumenCategorias(filtrosAplicados),
      ])
    } catch (requestError) {
      setToast({ message: requestError.message, type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  function actualizarCategoriaNueva(event) {
    const { name, value, type, checked } = event.target
    setCategoriaNueva((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function cerrarModalCategoria() {
    setCrearCategoriaAbierto(false)
    setCategoriaNueva({ nombre: '', descripcion: '', activo: true })
  }

  async function handleCrearCategoria(event) {
    event.preventDefault()
    const nombre = categoriaNueva.nombre.trim()

    if (!nombre) {
      setToast({ message: 'El nombre de la categoría es obligatorio.', type: 'error' })
      return
    }

    try {
      setCategoriaSaving(true)
      await crearCategoria({
        nombre,
        descripcion: categoriaNueva.descripcion.trim(),
        activo: categoriaNueva.activo,
      })
      setToast({ message: 'Categoría creada correctamente.', type: 'success' })
      await cargarCategorias()
      cerrarModalCategoria()
    } catch (requestError) {
      setToast({ message: requestError.message, type: 'error' })
    } finally {
      setCategoriaSaving(false)
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
      <section className="card filtros-v2">
        <div className="filtros-v2-header">
          <div>
            <p className="eyebrow">Explorar gastos</p>
            <h2>Filtros</h2>
          </div>
          <div className="quick-filters">
            <button type="button" className="btn secondary" onClick={aplicarEsteMes}>Este mes</button>
            <button type="button" className="btn secondary" onClick={aplicarUltimos30Dias}>Últimos 30 días</button>
          </div>
        </div>

        <div className="filtros-principales">
          <label className="field-highlight">
            Mes
            <select name="mes" value={filtros.mes} onChange={actualizarFiltro}>
              <option value="">Todos los meses</option>
              {opcionesMes.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
              ))}
            </select>
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

          <label className="field-search">
            Buscar
            <input
              name="texto"
              value={filtros.texto}
              onChange={actualizarFiltro}
              placeholder="Buscar por descripción"
            />
          </label>

          <div className="filtros-acciones-principales">
            <button type="button" className="btn primary" onClick={() => aplicarFiltros(filtros)}>
              Aplicar
            </button>
            <button type="button" className="btn secondary" onClick={limpiarFiltros}>
              Limpiar
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setMostrarAvanzados((prev) => !prev)}
            >
              {mostrarAvanzados ? 'Ocultar avanzados' : 'Más filtros'}
            </button>
          </div>
        </div>

        {mostrarAvanzados ? (
          <div className="filtros-avanzados">
            <label>
              Fecha desde
              <input type="date" name="fechaDesde" value={filtros.fechaDesde} onChange={actualizarFiltro} />
            </label>

            <label>
              Fecha hasta
              <input type="date" name="fechaHasta" value={filtros.fechaHasta} onChange={actualizarFiltro} />
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
          </div>
        ) : null}

        {hayFiltrosActivos ? (
          <div className="active-chips" role="status" aria-live="polite">
            {filtrosActivos.map((chip) => (
              <span key={chip} className="chip">{chip}</span>
            ))}
          </div>
        ) : (
          <p className="filters-placeholder">Sin filtros activos. Estás viendo todos los gastos.</p>
        )}
      </section>
      <section className="metrics-grid">
        <MetricCard
          title={`Total de gastos ${etiquetaMes(filtrosAplicados.mes)}`}
          value={formatearMoneda(metricas.total)}
          helperText="Suma global del resultado filtrado"
          icon="💸"
          tone="pink"
        />
        <MetricCard
          title="Gastos"
          value={metricas.cantidad}
          helperText="Número de gastos registrados"
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


      <section className="card category-chart-card">
        <div className="section-header category-header-actions">
          <div>
            <p className="eyebrow">Análisis visual</p>
            <h2>Gastos por categoría</h2>
            <p>Distribución del monto total por categoría según los filtros activos.</p>
          </div>
          <button
            type="button"
            className="btn primary create-trigger"
            onClick={() => setCrearCategoriaAbierto(true)}
          >
            + Añadir categoría
          </button>
        </div>
        <CategoryPieChart
          data={resumenCategorias}
          loading={resumenLoading}
          error={resumenError}
        />
      </section>

      

      {error ? (
        <div className="card error-banner">
          <strong>No se pudieron cargar los gastos.</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <section className="content-grid">
        <div>
          <div className="section-header table-head-ux">
            <div>
              <h2>
                {filtrosAplicados.mes
                  ? `Listado de gastos de ${etiquetaMes(filtrosAplicados.mes)}`
                  : 'Listado de gastos'}
              </h2>
              <p>{hayFiltrosActivos ? 'Resultados según filtros aplicados.' : 'Edita o elimina desde la tabla responsive.'}</p>
            </div>
            <div className="table-header-actions">
              {hayFiltrosActivos ? (
                <button type="button" className="btn secondary" onClick={limpiarFiltros}>Ver todos</button>
              ) : null}
              <button type="button" className="btn primary create-trigger" onClick={() => setCrearAbierto(true)}>
                + Agregar gasto
              </button>
            </div>
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

      {crearAbierto ? (
        <div
          className="modal-overlay edit-overlay"
          onClick={() => setCrearAbierto(false)}
          role="presentation"
        >
          <div className="card edit-modal create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="edit-modal-header">
              <div>
                <p className="eyebrow">Nuevo registro</p>
                <h3>Nuevo gasto</h3>
                <p className="modal-subtitle">Registra un nuevo movimiento para mantener tu control financiero al día.</p>
              </div>
              <button
                type="button"
                className="btn secondary close-btn"
                onClick={() => setCrearAbierto(false)}
              >
                Cerrar
              </button>
            </div>
            <GastoForm
              initialData={null}
              onSubmit={handleCreateOrUpdate}
              onCancel={() => setCrearAbierto(false)}
              isSaving={saving}
              categorias={categorias}
              categoriasLoading={categoriasLoading}
              mode="create"
            />
          </div>
        </div>
      ) : null}

      {crearCategoriaAbierto ? (
        <div
          className="modal-overlay edit-overlay"
          onClick={cerrarModalCategoria}
          role="presentation"
        >
          <div className="card edit-modal create-modal category-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="edit-modal-header">
              <div>
                <p className="eyebrow">Nueva categoría</p>
                <h3>Añadir categoría</h3>
                <p className="modal-subtitle">Crea una categoría para usarla en nuevos gastos.</p>
              </div>
              <button
                type="button"
                className="btn secondary close-btn"
                onClick={cerrarModalCategoria}
                disabled={categoriaSaving}
              >
                Cerrar
              </button>
            </div>

            <form className="gasto-form category-form" onSubmit={handleCrearCategoria}>
              <label>
                Nombre
                <input
                  name="nombre"
                  value={categoriaNueva.nombre}
                  onChange={actualizarCategoriaNueva}
                  placeholder="Ej. Transporte"
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Descripción
                <input
                  name="descripcion"
                  value={categoriaNueva.descripcion}
                  onChange={actualizarCategoriaNueva}
                  placeholder="Opcional"
                  maxLength={180}
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="activo"
                  checked={categoriaNueva.activo}
                  onChange={actualizarCategoriaNueva}
                />
                Activa
              </label>

              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={cerrarModalCategoria} disabled={categoriaSaving}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary create-trigger" disabled={categoriaSaving}>
                  {categoriaSaving ? 'Guardando...' : 'Guardar categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
