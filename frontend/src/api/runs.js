import { apiFetch } from './client'

// ── Sans pagination (Dashboard, Campagnes) ────────────────────────────────────
export const getRuns   = ()     => apiFetch('/runs')
export const getRun    = (id)   => apiFetch(`/runs/${id}`)
export const getRunLogs = (id)  => apiFetch(`/runs/${id}/logs`)
export const getRunsByProject = (projectId) => apiFetch(`/runs/project/${projectId}`)

// ── Avec pagination + filtres — RunsHistoryPage ───────────────────────────────
/**
 * @param {number} page    page courante (0-based)
 * @param {number} size    éléments par page
 * @param {string} status  filtre statut ou null
 * @param {string} search  filtre texte ou null
 */
export const getRunsPaged = (page = 0, size = 10, status = null, search = null) => {
  const params = new URLSearchParams()
  params.set('page', page)
  params.set('size', size)
  if (status && status !== 'TOUS') params.set('status', status)
  if (search && search.trim())     params.set('search', search.trim())
  return apiFetch(`/runs/paged?${params.toString()}`)
}

// ── Actions ───────────────────────────────────────────────────────────────────
export const cancelRun = (id) =>
  apiFetch(`/runs/${id}/cancel`, { method: 'POST' })

export const rerunRun  = (id) =>
  apiFetch(`/runs/${id}/rerun`,  { method: 'POST' })

export const launchRun = (projectId, body) =>
  apiFetch(`/runs/project/${projectId}`, { method: 'POST', body: JSON.stringify(body) })