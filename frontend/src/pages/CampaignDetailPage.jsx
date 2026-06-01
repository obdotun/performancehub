import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, LinearProgress, Button,
  Chip, Grid, Stack, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  TextField, MenuItem, Alert, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, Checkbox, InputAdornment,
} from '@mui/material'
import ArrowBackIcon     from '@mui/icons-material/ArrowBack'
import AttachFileIcon    from '@mui/icons-material/AttachFile'
import UploadFileIcon    from '@mui/icons-material/UploadFile'
import DownloadIcon      from '@mui/icons-material/Download'
import DeleteIcon        from '@mui/icons-material/Delete'
import EditIcon          from '@mui/icons-material/Edit'
import SaveIcon          from '@mui/icons-material/Save'
import OpenInNewIcon     from '@mui/icons-material/OpenInNew'
import AddIcon           from '@mui/icons-material/Add'
import RemoveCircleIcon  from '@mui/icons-material/RemoveCircle'
import SearchIcon        from '@mui/icons-material/Search'
import { getCampaign, updateCampaign, addCampaignAttachment, deleteCampaignAttachment, addRunToCampaign, removeRunFromCampaign } from '../api/campaigns'
import { getRuns } from '../api/runs'
import StatusChip from '../components/StatusChip'
import { CampaignStatusChip, STATUS_OPTIONS } from './CampaignsPage'
import dayjs from 'dayjs'

const MAX_FILE_MB   = 20
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024

export default function CampaignDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const fileInputRef = useRef(null)

  const [campaign, setCampaign]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)

  // Champs éditables
  const [editName, setEditName]       = useState('')
  const [editDesc, setEditDesc]       = useState('')
  const [editStatus, setEditStatus]   = useState('')
  const [editRelease, setEditRelease] = useState('')

  // Ajout de runs en mode édition
  const [allRuns, setAllRuns]             = useState([])
  const [runSearch, setRunSearch]         = useState('')
  const [addRunsOpen, setAddRunsOpen]     = useState(false)
  const [runsToAdd, setRunsToAdd]         = useState(new Set())
  const [removeTarget, setRemoveTarget]   = useState(null)

  // Upload
  const [attachFile, setAttachFile] = useState(null)
  const [attachNote, setAttachNote] = useState('')
  const [fileError, setFileError]   = useState('')
  const [uploading, setUploading]   = useState(false)

  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' })
  const [deleteAttach, setDeleteAttach] = useState(null)

  const load = () => {
    setLoading(true)
    getCampaign(id)
      .then(data => {
        setCampaign(data)
        setEditName(data.name)
        setEditDesc(data.description || '')
        setEditStatus(data.status)
        setEditRelease(data.targetReleaseDate || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  // Charger tous les runs pour la dialog d'ajout
  const openAddRuns = () => {
    getRuns().then(data => {
      const existingIds = new Set(campaign.runs.map(r => r.id))
      setAllRuns(Array.isArray(data) ? data.filter(r => !existingIds.has(r.id)) : [])
      setRunsToAdd(new Set())
      setRunSearch('')
      setAddRunsOpen(true)
    })
  }

  const handleSave = async () => {
    try {
      await updateCampaign(id, { name: editName, description: editDesc, status: editStatus,
        targetReleaseDate: editRelease || null })
      setEditing(false)
      load()
      setSnackbar({ open: true, message: 'Campagne mise à jour.', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    }
  }

  const handleAddRuns = async () => {
    try {
      for (const runId of runsToAdd) {
        await addRunToCampaign(id, runId)
      }
      setAddRunsOpen(false)
      load()
      setSnackbar({ open: true, message: `${runsToAdd.size} run(s) ajouté(s).`, severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    }
  }

  const handleRemoveRun = async () => {
    try {
      await removeRunFromCampaign(id, removeTarget.id)
      setRemoveTarget(null)
      load()
      setSnackbar({ open: true, message: `Run #${removeTarget.id} retiré.`, severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`Fichier trop volumineux : ${(file.size / 1024 / 1024).toFixed(1)} Mo (max ${MAX_FILE_MB} Mo)`)
      setAttachFile(null); return
    }
    setFileError(''); setAttachFile(file)
  }

  const handleUpload = async () => {
    if (!attachFile) return
    setUploading(true)
    try {
      await addCampaignAttachment(id, attachFile, attachNote)
      setAttachFile(null); setAttachNote(''); setFileError('')
      load()
      setSnackbar({ open: true, message: `"${attachFile.name}" ajouté.`, severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    } finally { setUploading(false) }
  }

  const handleDeleteAttachment = async () => {
    try {
      await deleteCampaignAttachment(deleteAttach.id)
      setDeleteAttach(null); load()
      setSnackbar({ open: true, message: 'Fichier supprimé.', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    }
  }

  const filteredAllRuns = allRuns.filter(r =>
    !runSearch ||
    r.simulationClass?.toLowerCase().includes(runSearch.toLowerCase()) ||
    r.project?.name?.toLowerCase().includes(runSearch.toLowerCase())
  )

  if (loading) return <LinearProgress />
  if (!campaign) return <Typography color="error">Campagne introuvable.</Typography>

  const successRate = campaign.totalRuns > 0
    ? Math.round((campaign.successRuns / campaign.totalRuns) * 100) : null

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/campaigns')} size="small"><ArrowBackIcon /></IconButton>
        <Box sx={{ flexGrow: 1 }}>
          {editing
            ? <TextField size="small" value={editName} onChange={e => setEditName(e.target.value)} sx={{ minWidth: 320 }} />
            : <Typography variant="h5" fontWeight={700}>{campaign.name}</Typography>
          }
          <Typography variant="body2" color="text.secondary">
            Créée par {campaign.createdBy} · {dayjs(campaign.createdAt).format('DD/MM/YYYY HH:mm')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {editing
            ? <>
                <Button variant="outlined" color="inherit" size="small" onClick={() => setEditing(false)}>Annuler</Button>
                <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSave}>Enregistrer</Button>
              </>
            : <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)}>Modifier</Button>
          }
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Colonne principale */}
        <Grid item xs={12} md={8}>
          {/* Infos campagne */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Statut</Typography>
                  {editing
                    ? <TextField select fullWidth size="small" value={editStatus}
                        onChange={e => setEditStatus(e.target.value)} sx={{ mt: 0.5 }}>
                        {STATUS_OPTIONS.map(s => (
                          <MenuItem key={s.value} value={s.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{s.icon} {s.label}</Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    : <Box sx={{ mt: 0.5 }}><CampaignStatusChip status={campaign.status} /></Box>
                  }
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Date de MEP prévue</Typography>
                  {editing
                    ? <TextField fullWidth size="small" type="date" value={editRelease}
                        onChange={e => setEditRelease(e.target.value)} sx={{ mt: 0.5 }} InputLabelProps={{ shrink: true }} />
                    : <Typography variant="body2" sx={{ mt: 0.5 }}>{campaign.targetReleaseDate ?? '—'}</Typography>
                  }
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  {editing
                    ? <TextField fullWidth size="small" multiline rows={2} value={editDesc}
                        onChange={e => setEditDesc(e.target.value)} sx={{ mt: 0.5 }} />
                    : <Typography variant="body2" color={campaign.description ? 'text.primary' : 'text.disabled'} sx={{ mt: 0.5 }}>
                        {campaign.description || 'Aucune description'}
                      </Typography>
                  }
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Runs associés */}
          <Card>
            <CardContent sx={{ pb: '0 !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Runs associés ({campaign.totalRuns})
                </Typography>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAddRuns}>
                  Ajouter des runs
                </Button>
              </Box>
            </CardContent>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem' } }}>
                    <TableCell>#</TableCell>
                    <TableCell>PROJET</TableCell>
                    <TableCell>SIMULATION</TableCell>
                    <TableCell align="right">REQUÊTES</TableCell>
                    <TableCell align="right">TEMPS MOY.</TableCell>
                    <TableCell>DATE</TableCell>
                    <TableCell>STATUT</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaign.runs?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        Aucun run associé.
                      </TableCell>
                    </TableRow>
                  )}
                  {campaign.runs?.map(run => (
                    <TableRow key={run.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/runs/${run.id}`)}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>#{run.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 120 }}>{run.projectName ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: 200, display: 'block' }} noWrap>{run.simulationClass}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{run.totalRequests?.toLocaleString() ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {run.meanResponseTime != null
                          ? <Chip label={`${run.meanResponseTime} ms`} size="small"
                              color={run.meanResponseTime < 500 ? 'success' : run.meanResponseTime < 2000 ? 'warning' : 'error'}
                              variant="outlined" />
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{run.startedAt}</Typography>
                      </TableCell>
                      <TableCell><StatusChip status={run.status} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Voir le run">
                            <IconButton size="small" onClick={e => { e.stopPropagation(); navigate(`/runs/${run.id}`) }}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Retirer de la campagne">
                            <IconButton size="small" color="error"
                              onClick={e => { e.stopPropagation(); setRemoveTarget(run) }}>
                              <RemoveCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Colonne droite — stats + pièces jointes */}
        <Grid item xs={12} md={4}>
          {/* Stats */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Résultats</Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'Total runs',  value: campaign.totalRuns,   color: 'text.primary' },
                  { label: 'Succès',      value: campaign.successRuns, color: 'success.main' },
                  { label: 'Échecs',      value: campaign.failedRuns,  color: campaign.failedRuns > 0 ? 'error.main' : 'text.primary' },
                  { label: 'Taux succès', value: successRate != null ? `${successRate}%` : '—', color: 'primary.main' },
                ].map(s => (
                  <Grid item xs={6} key={s.label}>
                    <Box sx={{ p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color={s.color}>{s.value ?? '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Pièces jointes */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                Pièces jointes ({campaign.attachments?.length ?? 0})
              </Typography>
              <Box sx={{
                border: '2px dashed',
                borderColor: fileError ? 'error.main' : attachFile ? 'primary.main' : 'divider',
                borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer', mb: 1,
                '&:hover': { borderColor: fileError ? 'error.main' : 'primary.light' },
              }} onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" hidden onChange={handleFileChange} />
                <UploadFileIcon sx={{ fontSize: 28, color: fileError ? 'error.main' : attachFile ? 'primary.main' : 'text.disabled' }} />
                {attachFile
                  ? <><Typography variant="body2" fontWeight={600} noWrap>{attachFile.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{(attachFile.size / 1024 / 1024).toFixed(1)} Mo</Typography></>
                  : <Typography variant="caption" color="text.secondary">Ajouter un fichier (max {MAX_FILE_MB} Mo)</Typography>
                }
              </Box>
              {fileError && <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>{fileError}</Typography>}
              {attachFile && (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <TextField fullWidth size="small" label="Note (optionnelle)"
                    value={attachNote} onChange={e => setAttachNote(e.target.value)} />
                  <Button fullWidth variant="contained" size="small" startIcon={<AttachFileIcon />}
                    onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Envoi...' : 'Associer'}
                  </Button>
                </Stack>
              )}
              <Divider sx={{ mb: 1.5 }} />
              {campaign.attachments?.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 1 }}>
                  Aucune pièce jointe
                </Typography>
              )}
              <Stack spacing={1}>
                {campaign.attachments?.map(a => (
                  <Box key={a.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, p: 1,
                    borderRadius: 1, border: '1px solid', borderColor: 'divider',
                    '&:hover': { borderColor: 'primary.main' },
                  }}>
                    <AttachFileIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="caption" fontWeight={600} noWrap display="block">{a.originalFileName}</Typography>
                      {a.note && <Typography variant="caption" color="text.secondary" noWrap display="block">{a.note}</Typography>}
                      <Typography variant="caption" color="text.disabled">
                        {a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} Ko` : ''} · {a.uploadedAt}
                      </Typography>
                    </Box>
                    <Tooltip title="Télécharger">
                      <IconButton size="small" color="primary" onClick={() => window.open(a.downloadUrl, '_blank')}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => setDeleteAttach(a)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Dialog ajout de runs ── */}
      <Dialog open={addRunsOpen} onClose={() => setAddRunsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon color="primary" /> Ajouter des runs à la campagne
        </DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth size="small" placeholder="Filtrer les runs..."
            value={runSearch} onChange={e => setRunSearch(e.target.value)} sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <TableContainer sx={{ maxHeight: 380, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox size="small"
                      indeterminate={runsToAdd.size > 0 && runsToAdd.size < filteredAllRuns.length}
                      checked={filteredAllRuns.length > 0 && runsToAdd.size === filteredAllRuns.length}
                      onChange={() => {
                        if (runsToAdd.size === filteredAllRuns.length) setRunsToAdd(new Set())
                        else setRunsToAdd(new Set(filteredAllRuns.map(r => r.id)))
                      }} />
                  </TableCell>
                  {['#','PROJET','SIMULATION','DATE','STATUT'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAllRuns.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Aucun run disponible à ajouter.
                  </TableCell></TableRow>
                )}
                {filteredAllRuns.map(run => (
                  <TableRow key={run.id} hover selected={runsToAdd.has(run.id)}
                    onClick={() => setRunsToAdd(prev => { const n = new Set(prev); n.has(run.id) ? n.delete(run.id) : n.add(run.id); return n })}
                    sx={{ cursor: 'pointer' }}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={runsToAdd.has(run.id)}
                        onChange={() => setRunsToAdd(prev => { const n = new Set(prev); n.has(run.id) ? n.delete(run.id) : n.add(run.id); return n })}
                        onClick={e => e.stopPropagation()} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>#{run.id}</TableCell>
                    <TableCell><Typography variant="caption" fontWeight={500} noWrap sx={{ maxWidth: 120, display: 'block' }}>{run.project?.name ?? '—'}</Typography></TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: 200, display: 'block' }} noWrap>{run.simulationClass}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{dayjs(run.startedAt).format('DD/MM/YY HH:mm')}</Typography></TableCell>
                    <TableCell><StatusChip status={run.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {runsToAdd.size > 0 && (
            <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
              {runsToAdd.size} run(s) sélectionné(s)
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddRunsOpen(false)} color="inherit">Annuler</Button>
          <Button variant="contained" startIcon={<AddIcon />}
            disabled={runsToAdd.size === 0} onClick={handleAddRuns}>
            Ajouter {runsToAdd.size > 0 ? `(${runsToAdd.size})` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog retrait d'un run ── */}
      <Dialog open={!!removeTarget} onClose={() => setRemoveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Retirer ce run ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Le run <strong>#{removeTarget?.id}</strong> sera retiré de cette campagne (non supprimé).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)} color="inherit">Annuler</Button>
          <Button variant="contained" color="error" onClick={handleRemoveRun}>Retirer</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog suppression fichier ── */}
      <Dialog open={!!deleteAttach} onClose={() => setDeleteAttach(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer le fichier ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2"><strong>"{deleteAttach?.originalFileName}"</strong> sera définitivement supprimé.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAttach(null)} color="inherit">Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAttachment}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}