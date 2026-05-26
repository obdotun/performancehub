import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, LinearProgress,
  Button, Chip, IconButton, Tooltip, Grid, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Checkbox,
  Alert, Snackbar, InputAdornment, Divider,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import DownloadIcon from '@mui/icons-material/Download'
import { getCampaigns, createCampaign, deleteCampaign, addCampaignAttachment, deleteCampaignAttachment } from '../api/campaigns'
import { getRuns } from '../api/runs'
import StatusChip from '../components/StatusChip'
import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'En cours',  color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  { value: 'COMPLETED',   label: 'Terminée',  color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
]

function CampaignStatusChip({ status }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status)
  if (!opt) return null
  return (
    <Chip
      icon={opt.icon}
      label={opt.label}
      size="small"
      color={opt.color}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  )
}

// ── Formulaire de création ───────────────────────────────────────────────────
function CampaignFormDialog({ open, onClose, onCreated, preselectedRunIds = [] }) {
  const fileInputRef = React.useRef(null)

  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus]           = useState('IN_PROGRESS')
  const [releaseDate, setReleaseDate] = useState(null)
  const [selectedRuns, setSelectedRuns] = useState(new Set(preselectedRunIds))
  const [attachedFile, setAttachedFile] = useState(null)
  const [fileNote, setFileNote]         = useState('')
  const [runs, setRuns]               = useState([])
  const [runSearch, setRunSearch]     = useState('')
  const [loading, setLoading]         = useState(false)
  const [snackbar, setSnackbar]       = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (open) {
      getRuns().then(data => setRuns(Array.isArray(data) ? data : [])).catch(console.error)
      setSelectedRuns(new Set(preselectedRunIds))
    }
  }, [open])

  const filteredRuns = runs.filter(r =>
    !runSearch ||
    r.simulationClass?.toLowerCase().includes(runSearch.toLowerCase()) ||
    r.project?.name?.toLowerCase().includes(runSearch.toLowerCase())
  )

  const toggleRun = (id) => {
    setSelectedRuns(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedRuns.size === filteredRuns.length) setSelectedRuns(new Set())
    else setSelectedRuns(new Set(filteredRuns.map(r => r.id)))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setSnackbar({ open: true, message: 'Le nom est obligatoire.', severity: 'warning' })
      return
    }
    if (selectedRuns.size === 0) {
      setSnackbar({ open: true, message: 'Sélectionnez au moins un run.', severity: 'warning' })
      return
    }

    setLoading(true)
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        description: description.trim(),
        status,
        targetReleaseDate: releaseDate ? releaseDate.format('YYYY-MM-DD') : null,
        runIds: [...selectedRuns],
      })

      // Attacher le fichier si présent
      if (attachedFile) {
        await addCampaignAttachment(campaign.id, attachedFile, fileNote)
      }

      setSnackbar({ open: true, message: `Campagne "${campaign.name}" créée.`, severity: 'success' })
      setTimeout(() => { onCreated(campaign); handleClose() }, 800)
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName(''); setDescription(''); setStatus('IN_PROGRESS')
    setReleaseDate(null); setSelectedRuns(new Set())
    setAttachedFile(null); setFileNote(''); setRunSearch('')
    onClose()
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderSpecialIcon color="primary" />
          Nouvelle campagne de tests
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Colonne gauche — infos campagne */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Informations
              </Typography>

              <TextField
                fullWidth size="small" label="Nom de la campagne *"
                value={name} onChange={e => setName(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="ex: Sprint 23 — Montée en charge"
              />

              <TextField
                fullWidth size="small" label="Description"
                value={description} onChange={e => setDescription(e.target.value)}
                multiline rows={3} sx={{ mb: 2 }}
                placeholder="Objectifs, contexte..."
              />

              <TextField
                select fullWidth size="small" label="Statut"
                value={status} onChange={e => setStatus(e.target.value)}
                sx={{ mb: 2 }}
              >
                {STATUS_OPTIONS.map(s => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </TextField>

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Date de MEP prévue"
                  value={releaseDate}
                  onChange={setReleaseDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { mb: 2 } } }}
                />
              </LocalizationProvider>

              <Divider sx={{ my: 1.5 }} />

              {/* Upload fichier */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Rapport (optionnel)
              </Typography>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: attachedFile ? 'primary.main' : 'divider',
                  borderRadius: 2, p: 2, textAlign: 'center',
                  cursor: 'pointer', transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.light' },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" hidden onChange={e => setAttachedFile(e.target.files?.[0] || null)} />
                <UploadFileIcon sx={{ fontSize: 32, color: attachedFile ? 'primary.main' : 'text.disabled', mb: 0.5 }} />
                {attachedFile
                  ? <Typography variant="body2" fontWeight={600} noWrap>{attachedFile.name}</Typography>
                  : <Typography variant="body2" color="text.secondary">Cliquez pour sélectionner</Typography>
                }
              </Box>
              {attachedFile && (
                <TextField
                  fullWidth size="small" label="Note sur le fichier"
                  value={fileNote} onChange={e => setFileNote(e.target.value)}
                  sx={{ mt: 1 }}
                />
              )}
            </Grid>

            {/* Colonne droite — sélection runs */}
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Runs à associer *
                </Typography>
                <Typography
                  variant="caption" color="primary" sx={{ cursor: 'pointer' }}
                  onClick={toggleAll}
                >
                  {selectedRuns.size === filteredRuns.length && filteredRuns.length > 0
                    ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Typography>
              </Box>

              <TextField
                fullWidth size="small" placeholder="Filtrer les runs..."
                value={runSearch} onChange={e => setRunSearch(e.target.value)}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                }}
              />

              <TableContainer sx={{ maxHeight: 340, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedRuns.size > 0 && selectedRuns.size < filteredRuns.length}
                          checked={filteredRuns.length > 0 && selectedRuns.size === filteredRuns.length}
                          onChange={toggleAll} size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>PROJET</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>SIMULATION</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>STATUT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRuns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          Aucun run disponible.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRuns.map(run => (
                      <TableRow
                        key={run.id} hover selected={selectedRuns.has(run.id)}
                        onClick={() => toggleRun(run.id)} sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedRuns.has(run.id)} size="small"
                            onChange={() => toggleRun(run.id)} onClick={e => e.stopPropagation()} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>#{run.id}</TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={500} noWrap sx={{ maxWidth: 100, display: 'block' }}>
                            {run.project?.name ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: 160, display: 'block' }} noWrap>
                            {run.simulationClass}
                          </Typography>
                        </TableCell>
                        <TableCell><StatusChip status={run.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedRuns.size > 0 && (
                <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                  {selectedRuns.size} run(s) sélectionné(s)
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit" disabled={loading}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}
            startIcon={<FolderSpecialIcon />}>
            {loading ? 'Création...' : 'Créer la campagne'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

// ── Carte campagne ───────────────────────────────────────────────────────────
function CampaignCard({ campaign, onDelete, onOpen }) {
  const successRate = campaign.totalRuns > 0
    ? Math.round((campaign.successRuns / campaign.totalRuns) * 100)
    : null

  return (
    <Card sx={{
      height: '100%', cursor: 'pointer', transition: 'all 0.2s',
      border: '1px solid rgba(48,54,61,0.5)',
      '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(0,176,255,0.03)' },
    }} onClick={onOpen}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0, mr: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>{campaign.name}</Typography>
            {campaign.description && (
              <Typography variant="caption" color="text.secondary"
                sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {campaign.description}
              </Typography>
            )}
          </Box>
          <CampaignStatusChip status={campaign.status} />
        </Box>

        {/* Stats */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.04)' }}>
              <Typography variant="h6" fontWeight={700}>{campaign.totalRuns}</Typography>
              <Typography variant="caption" color="text.secondary">Runs</Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: 'rgba(0,255,100,0.05)' }}>
              <Typography variant="h6" fontWeight={700} color="success.main">{campaign.successRuns}</Typography>
              <Typography variant="caption" color="text.secondary">Succès</Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: campaign.failedRuns > 0 ? 'rgba(255,50,50,0.07)' : 'rgba(255,255,255,0.04)' }}>
              <Typography variant="h6" fontWeight={700} color={campaign.failedRuns > 0 ? 'error.main' : 'text.primary'}>
                {campaign.failedRuns}
              </Typography>
              <Typography variant="caption" color="text.secondary">Échecs</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1}>
            {campaign.attachments?.length > 0 && (
              <Chip icon={<AttachFileIcon />} label={`${campaign.attachments.length} fichier(s)`}
                size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            )}
            {campaign.targetReleaseDate && (
              <Chip label={`MEP : ${campaign.targetReleaseDate}`}
                size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            )}
          </Stack>
          <Tooltip title="Supprimer">
            <IconButton size="small" color="error"
              onClick={e => { e.stopPropagation(); onDelete(campaign) }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedRunIds = searchParams.get('runIds')
    ? searchParams.get('runIds').split(',').map(Number)
    : []

  const [campaigns, setCampaigns]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [createOpen, setCreateOpen] = useState(!!preselectedRunIds.length)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [snackbar, setSnackbar]     = useState({ open: false, message: '', severity: 'success' })

  const load = () => {
    setLoading(true)
    getCampaigns()
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = campaigns.filter(c => {
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const handleDelete = async () => {
    try {
      await deleteCampaign(deleteTarget.id)
      setSnackbar({ open: true, message: `Campagne "${deleteTarget.name}" supprimée.`, severity: 'success' })
      setDeleteTarget(null)
      load()
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    }
  }

  const stats = {
    total:      campaigns.length,
    inProgress: campaigns.filter(c => c.status === 'IN_PROGRESS').length,
    completed:  campaigns.filter(c => c.status === 'COMPLETED').length,
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Campagnes de tests</Typography>
          <Typography variant="body2" color="text.secondary">
            {stats.total} campagne(s) · {stats.inProgress} en cours · {stats.completed} terminée(s)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Nouvelle campagne
          </Button>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Filtres */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Rechercher une campagne..."
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 280 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
            />
            <TextField
              select size="small" label="Statut"
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="ALL">TOUS</MenuItem>
              {STATUS_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Grille de campagnes */}
      {!loading && filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FolderSpecialIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="body1">Aucune campagne trouvée.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setCreateOpen(true)}>
            Créer la première campagne
          </Button>
        </Box>
      )}

      <Grid container spacing={2}>
        {filtered.map(campaign => (
          <Grid item xs={12} sm={6} md={4} key={campaign.id}>
            <CampaignCard
              campaign={campaign}
              onOpen={() => navigate(`/campaigns/${campaign.id}`)}
              onDelete={setDeleteTarget}
            />
          </Grid>
        ))}
      </Grid>

      {/* Dialog création */}
      <CampaignFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load()}
        preselectedRunIds={preselectedRunIds}
      />

      {/* Dialog suppression */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer la campagne ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            La campagne <strong>"{deleteTarget?.name}"</strong> et ses pièces jointes seront définitivement supprimées.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}