const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:44364/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    let details = 'Ocurrió un error inesperado al contactar la API.'

    if (contentType?.includes('application/json')) {
      const data = await response.json()
      details = data?.message ?? data?.mensaje ?? JSON.stringify(data)
    } else {
      details = await response.text()
    }

    throw new Error(details || `Error HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return null
  }

  return response.json()
}

function normalizarGasto(gasto) {
  return {
    id: gasto?.id ?? gasto?.Id,
    descripcion: gasto?.descripcion ?? gasto?.Descripcion ?? '',
    monto: gasto?.monto ?? gasto?.Monto ?? 0,
    fecha: gasto?.fecha ?? gasto?.Fecha ?? '',
    categoriaId: gasto?.categoriaId ?? gasto?.CategoriaId ?? null,
    nombreCategoria: gasto?.nombreCategoria ?? gasto?.NombreCategoria ?? 'Sin categoría',
  }
}

function normalizarCategoria(categoria) {
  return {
    id: categoria?.id ?? categoria?.Id,
    nombre: categoria?.nombre ?? categoria?.Nombre ?? '',
    descripcion: categoria?.descripcion ?? categoria?.Descripcion ?? '',
    activo: categoria?.activo ?? categoria?.Activo ?? true,
  }
}

export async function obtenerGastos(filtros = {}) {
  const query = new URLSearchParams()

  Object.entries(filtros).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, String(value))
  })

  const path = query.toString() ? `/gastos?${query.toString()}` : '/gastos'
  const gastos = await request(path)
  return (gastos ?? []).map(normalizarGasto)
}

export function crearGasto(gasto) {
  return request('/gastos', {
    method: 'POST',
    body: JSON.stringify(gasto),
  })
}

export function actualizarGasto(id, gasto) {
  return request(`/gastos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(gasto),
  })
}

export function eliminarGasto(id) {
  return request(`/gastos/${id}`, {
    method: 'DELETE',
  })
}

export async function obtenerCategorias() {
  const categorias = await request('/categorias')
  return (categorias ?? []).map(normalizarCategoria)
}

export { API_BASE_URL }
