import { apiFetch } from './client'

export const getRuns          = ()          => apiFetch('/runs')
export const getRun           = (id)        => apiFetch(`/runs/${id}`)
export const getRunsByProject = (pid)       => apiFetch(`/runs/project/${pid}`)
export const getRunLogs       = (id)        => apiFetch(`/runs/${id}/logs`)

export const launchRun = (pid, body) =>
  apiFetch(`/runs/project/${pid}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })