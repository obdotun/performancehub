const BASE = '/api'

function getToken() {
  try {
    const stored = localStorage.getItem('perfhub_auth')
    if (!stored || stored === 'undefined' || stored === 'null') {
      localStorage.removeItem('perfhub_auth')
      return null
    }
    const parsed = JSON.parse(stored)
    return parsed?.token ?? null
  } catch {
    localStorage.removeItem('perfhub_auth')
    return null
  }
}

/**
 * skipAuthRedirect : ne pas rediriger vers /login sur 401/403
 * skipToken        : ne pas envoyer le header Authorization (ex: endpoint login)
 */
export async function apiFetch(path, options = {}) {
  const { skipAuthRedirect = false, skipToken = false, ...fetchOptions } = options

  const token      = skipToken ? null : getToken()
  const isFormData = fetchOptions.body instanceof FormData

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  }

  const method = fetchOptions.method || 'GET'
  console.debug(`[PerfHub] ${method} ${BASE}${path}`,
    skipToken ? '(no token)' : token ? `🔑 ${token.substring(0, 20)}...` : '❌ no token')

  let res
  try {
    res = await fetch(BASE + path, { ...fetchOptions, headers })
  } catch {
    throw Object.assign(
      new Error('Serveur inaccessible. Vérifiez que le backend est démarré sur le port 8085.'),
      { status: 0, network: true }
    )
  }

  console.debug(`[PerfHub] ← ${res.status} ${method} ${BASE}${path}`)

  if (res.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem('perfhub_auth')
    window.location.href = '/login'
    return
  }

  if (res.status === 403 && !skipAuthRedirect) {
    throw Object.assign(
      new Error(`Accès refusé (403) — ${method} ${BASE}${path}`),
      { status: 403 }
    )
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw Object.assign(new Error(err.message || 'Erreur serveur'), {
      status: res.status,
      data: err,
    })
  }

  // Réponses sans body (204, ou 200 avec body vide)
  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  return res.json().catch(() => null)
}