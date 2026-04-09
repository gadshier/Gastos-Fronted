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
  obtenerGastos,
} from './services/gastosApi'
import { formatearMoneda } from './utils/formatters'

function App() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [editando, setEditando] = useState(null)
  const [pendienteEliminar, setPendienteEliminar] = useState(null)

  async function cargarGastos() {
    try {
      setLoading(true)
      setError('')
      const data = await obtenerGastos()
      setGastos(data ?? [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarGastos()
  }, [])

  useEffect(() => {
    if (!toast.message) return undefined

    const timeout = setTimeout(() => {
      setToast({ message: '', type: 'success' })
    }, 3200)

    return () => clearTimeout(timeout)
  }, [toast.message])

  const metricas = useMemo(() => {
    const total = gastos.reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0)

    const categorias = gastos.reduce((acc, gasto) => {
      const categoria = gasto.categoria || 'Sin categoría'
      acc[categoria] = (acc[categoria] ?? 0) + 1
      return acc
    }, {})

    const categoriaTop = Object.entries(categorias).sort((a, b) => b[1] - a[1])[0]

    return {
      total,
      cantidad: gastos.length,
      categoriaTop: categoriaTop
        ? `${categoriaTop[0]} (${categoriaTop[1]})`
        : 'Sin datos disponibles',
    }
  }, [gastos])

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
      await cargarGastos()
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
      await cargarGastos()
    } catch (requestError) {
      setToast({ message: requestError.message, type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

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
          helperText="Suma global registrada"
          icon="💸"
          tone="pink"
        />
        <MetricCard
          title="Registros"
          value={metricas.cantidad}
          helperText="Gastos creados"
          icon="📊"
          tone="blue"
        />
        <MetricCard
          title="Categoría más usada"
          value={metricas.categoriaTop}
          helperText="Listo para métricas futuras"
          icon="🏷️"
          tone="purple"
        />
      </section>

      {error ? (
        <div className="card error-banner">
          <strong>No se pudieron cargar los gastos.</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <section className="content-grid">
        <GastoForm
          key={editando?.id ?? 'nuevo'}
          initialData={editando}
          onSubmit={handleCreateOrUpdate}
          onCancel={editando ? () => setEditando(null) : null}
          isSaving={saving}
        />

        <div>
          <div className="section-header">
            <h2>Listado de gastos</h2>
            <p>Edita o elimina desde la tabla responsive.</p>
          </div>
          <GastosTable
            gastos={gastos}
            loading={loading}
            onEdit={(gasto) => setEditando(gasto)}
            onDelete={(gasto) => setPendienteEliminar(gasto)}
          />
        </div>
      </section>

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
