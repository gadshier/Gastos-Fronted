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

export function obtenerGastos() {
  return request('/gastos')
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

export { API_BASE_URL }
