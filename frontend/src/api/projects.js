import { apiFetch } from './client'

export const getProjects    = ()   => apiFetch('/projects')
export const getProject     = (id) => apiFetch(`/projects/${id}`)
export const getSimulations = (id) => apiFetch(`/projects/${id}/simulations`)
export const deleteProject  = (id) => apiFetch(`/projects/${id}`, { method: 'DELETE' })

export const pullProject = (id, creds) =>
  apiFetch(`/projects/${id}/pull`, {
    method: 'POST',
    body: JSON.stringify(creds),
  })

export const listBranches = (body) =>
  apiFetch('/projects/branches', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const createFromZip = (name, description, zipFile) => {
  const form = new FormData()
  form.append('file', zipFile)
  form.append('request', JSON.stringify({ name, description, type: 'ZIP' }))
  // FormData détecté par apiFetch → pas de Content-Type manuel (boundary auto)
  return apiFetch('/projects/zip', { method: 'POST', body: form })
}

export const createFromBitbucket = (body) =>
  apiFetch('/projects/bitbucket', {
    method: 'POST',
    body: JSON.stringify(body),
  })