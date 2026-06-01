import { apiFetch } from './client'

export const getCampaigns   = ()      => apiFetch('/campaigns')
export const getCampaign    = (id)    => apiFetch(`/campaigns/${id}`)
export const deleteCampaign = (id)    => apiFetch(`/campaigns/${id}`, { method: 'DELETE' })

export const createCampaign = (body) =>
  apiFetch('/campaigns', { method: 'POST', body: JSON.stringify(body) })

export const updateCampaign = (id, body) =>
  apiFetch(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(body) })

// ── Gestion des runs ─────────────────────────────────────────────────────────
export const addRunToCampaign = (campaignId, runId) =>
  apiFetch(`/campaigns/${campaignId}/runs/${runId}`, { method: 'POST' })

export const removeRunFromCampaign = (campaignId, runId) =>
  apiFetch(`/campaigns/${campaignId}/runs/${runId}`, { method: 'DELETE' })

/** Campagnes auxquelles un run est rattaché — utilisé dans RunsHistoryPage */
export const getCampaignsByRun = (runId) =>
  apiFetch(`/campaigns/by-run/${runId}`)

// ── Pièces jointes ───────────────────────────────────────────────────────────
export const addCampaignAttachment = (campaignId, file, note) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('note', note || '')
  return apiFetch(`/campaigns/${campaignId}/attachments`, {
    method: 'POST',
    body: formData,
  })
}

export const deleteCampaignAttachment = (attachmentId) =>
  apiFetch(`/campaigns/attachments/${attachmentId}`, { method: 'DELETE' })