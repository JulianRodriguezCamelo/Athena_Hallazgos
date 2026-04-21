const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

interface RequestOptions {
  method?: string
  body?: unknown
  params?: Record<string, unknown>
  isFormData?: boolean
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<{ data: T }> {
  const { method = 'GET', body, params, isFormData } = options

  let url = `${API_URL}${path}`
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (query) url += `?${query}`
  }

  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    let errorData: { error?: string } = {}
    try { errorData = await res.json() } catch {}
    const err = Object.assign(new Error(errorData.error ?? `HTTP ${res.status}`), {
      response: { status: res.status, data: errorData },
    })
    throw err
  }

  const data: T = res.status === 204 ? ({} as T) : await res.json()
  return { data }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  metrics: () => request('/api/dashboard/metrics'),
  porEstado: () => request('/api/dashboard/por-estado'),
  porDependencia: () => request('/api/dashboard/por-dependencia'),
  porResponsable: () => request('/api/dashboard/por-responsable'),
  porEstadoPlan: () => request('/api/dashboard/por-estado-plan'),
  timeline: () => request('/api/dashboard/timeline'),
  prorrogas: () => request('/api/dashboard/prorrogas'),
  uploadsRecientes: () => request('/api/dashboard/uploads-recientes'),
}

// ── Dashboard Directivo ───────────────────────────────────────────────────────
export const directivoApi = {
  misMetricas: () => request('/api/dashboard/directivo/mis-metricas'),
  misHallazgos: (page = 1, perPage = 10) =>
    request('/api/dashboard/directivo/mis-hallazgos', { params: { page, per_page: perPage } }),
  misActividades: (page = 1, perPage = 10) =>
    request('/api/dashboard/directivo/mis-actividades', { params: { page, per_page: perPage } }),
  menciones: (page = 1, perPage = 10) =>
    request('/api/dashboard/directivo/menciones', { params: { page, per_page: perPage } }),
  porEstadoAccion: () => request('/api/dashboard/directivo/por-estado-accion'),
}

// ── Hallazgos ─────────────────────────────────────────────────────────────────
export const hallazgosApi = {
  list: (params?: Record<string, unknown>) =>
    request('/api/hallazgos/', { params }),
  get: (id: number) => request(`/api/hallazgos/${id}`),
  update: (id: number, data: Record<string, unknown>) =>
    request(`/api/hallazgos/${id}`, { method: 'PUT', body: data }),
  actividades: (id: number) => request(`/api/hallazgos/${id}/actividades`),
  estados: () => request('/api/hallazgos/estados'),
  dependencias: () => request('/api/hallazgos/dependencias'),
  responsables: () => request('/api/hallazgos/responsables'),
  estadosPlan: () => request('/api/hallazgos/estados_plan'),
  vicepresidencias: () => request('/api/hallazgos/vicepresidencias'),
  direcciones: () => request('/api/hallazgos/direcciones'),
}

// ── Actividades ───────────────────────────────────────────────────────────────
export const actividadesApi = {
  list: (params?: Record<string, unknown>) =>
    request('/api/hallazgos/actividades', { params }),
  updateEstado: (id: number, estado_accion: string) =>
    request(`/api/hallazgos/actividades/${id}/estado`, { method: 'PATCH', body: { estado_accion } }),
  checklist: (page = 1, perPage = 15) =>
    request('/api/hallazgos/checklist', { params: { page, per_page: perPage } }),
}

// ── Uploads ───────────────────────────────────────────────────────────────────
export const uploadsApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request('/api/uploads/', { method: 'POST', body: form, isFormData: true })
  },
  analyze: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request('/api/uploads/analyze', { method: 'POST', body: form, isFormData: true })
  },
  history: (params?: Record<string, unknown>) =>
    request('/api/uploads/history', { params }),
  detail: (id: number) => request(`/api/uploads/history/${id}`),
  delete: (id: number) => request(`/api/uploads/history/${id}`, { method: 'DELETE' }),
}

// ── Dashboard Gestor ──────────────────────────────────────────────────────────
export const gestorApi = {
  misMetricas: () => request('/api/dashboard/gestor/mis-metricas'),
  porEstado: () => request('/api/dashboard/gestor/por-estado'),
  porEstadoPlan: () => request('/api/dashboard/gestor/por-estado-plan'),
  porSemaforo: () => request('/api/dashboard/gestor/por-semaforo'),
  hallazgos: (page = 1, perPage = 50) =>
    request('/api/dashboard/gestor/hallazgos', { params: { page, per_page: perPage } }),
  actividades: (page = 1, perPage = 100) =>
    request('/api/dashboard/gestor/actividades', { params: { page, per_page: perPage } }),
  responsablesCriticos: () => request('/api/dashboard/gestor/responsables-criticos'),
  bitacora: () => request('/api/dashboard/gestor/bitacora'),
  tiempoPromedio: () => request('/api/dashboard/gestor/tiempo-promedio'),
}

// ── Notificaciones ────────────────────────────────────────────────────────────
export const notificacionesApi = {
  list: () => request('/api/notificaciones/'),
  markRead: (id: number) => request(`/api/notificaciones/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/api/notificaciones/read-all', { method: 'PATCH' }),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => request('/api/users/'),
  get: (id: number) => request(`/api/users/${id}`),
  create: (data: Record<string, unknown>) =>
    request('/api/users/', { method: 'POST', body: data }),
  update: (id: number, data: Record<string, unknown>) =>
    request(`/api/users/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => request(`/api/users/${id}`, { method: 'DELETE' }),
}
