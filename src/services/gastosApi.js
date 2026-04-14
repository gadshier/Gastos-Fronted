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


function normalizarResumenCategoria(item) {
  return {
    categoriaId: item?.categoriaId ?? item?.CategoriaId ?? null,
    nombreCategoria: item?.nombreCategoria ?? item?.NombreCategoria ?? 'Sin categoría',
    total: Number(item?.total ?? item?.Total ?? 0),
    cantidadMovimientos: Number(item?.cantidadMovimientos ?? item?.CantidadMovimientos ?? 0),
    porcentaje: Number(item?.porcentaje ?? item?.Porcentaje ?? 0),
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

export function crearCategoria(categoria) {
  return request('/categorias', {
    method: 'POST',
    body: JSON.stringify(categoria),
  })
}


export async function obtenerResumenPorCategoria(filtros = {}) {
  const query = new URLSearchParams()

  if (filtros.fechaDesde) query.append('fechaDesde', filtros.fechaDesde)
  if (filtros.fechaHasta) query.append('fechaHasta', filtros.fechaHasta)

  const path = query.toString()
    ? `/gastos/resumen/por-categoria?${query.toString()}`
    : '/gastos/resumen/por-categoria'

  const resumen = await request(path)
  return (resumen ?? []).map(normalizarResumenCategoria)
}

export { API_BASE_URL }
