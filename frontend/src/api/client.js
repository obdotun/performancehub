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
 * skipToken        : ne pas envoyer le header Authorization (login)
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
  } catch (networkErr) {
    // Erreur réseau : serveur éteint, Docker redémarré, timeout Nginx
    console.error(`[PerfHub] Erreur réseau sur ${method} ${BASE}${path}`, networkErr)
    throw Object.assign(
      new Error('Connexion perdue. Le serveur est inaccessible — vérifiez que le backend est démarré.'),
      { status: 0, network: true }
    )
  }

  console.debug(`[PerfHub] ← ${res.status} ${method} ${BASE}${path}`)

  // 502 Bad Gateway = Nginx up mais backend down ou timeout
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw Object.assign(
      new Error('Le serveur backend est temporairement indisponible (502/503/504). Réessayez dans quelques secondes.'),
      { status: res.status, gateway: true }
    )
  }

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

  // Réponses sans body (204 ou 200 avec body vide)
  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  return res.json().catch(() => null)
}