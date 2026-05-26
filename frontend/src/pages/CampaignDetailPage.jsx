import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, LinearProgress, Button,
  Chip, Grid, Stack, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  TextField, MenuItem, Alert, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import { getCampaign, updateCampaign, addCampaignAttachment, deleteCampaignAttachment } from '../api/campaigns'
import { apiFetch } from '../api/client'
import StatusChip from '../components/StatusChip'
import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'En cours',  color: 'warning' },
  { value: 'COMPLETED',   label: 'Terminée',  color: 'success' },
]

export default function CampaignDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const fileInputRef = useRef(null)

  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)

  // Champs éditables
  const [editName, setEditName]           = useState('')
  const [editDesc, setEditDesc]           = useState('')
  const [editStatus, setEditStatus]       = useState('')
  const [editRelease, setEditRelease]     = useState('')

  // Upload
  const [attachFile, setAttachFile]   = useState(null)
  const [attachNote, setAttachNote]   = useState('')
  const [uploading, setUploading]     = useState(false)

  const [snackbar, setSnackbar]       = useState({ open: false, message: '', severity: 'success' })
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

  const handleSave = async () => {
    try {
      await updateCampaign(id, {
        name: editName,
        description: editDesc,
        status: editStatus,
        targetReleaseDate: editRelease || null,
      })
      setEditing(false)
      load()
      setSnackbar({ open: true, message: 'Campagne mise à jour.', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    }
  }

  const handleUpload = async () => {
    if (!attachFile) return
    setUploading(true)
    try {
      await addCampaignAttachment(id, attachFile, attachNote)
      setAttachFile(null)
      setAttachNote('')
      load()
      setSnackbar({ open: true, message: `"${attachFile.name}" ajouté.`, severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async () => {
    try {
      await deleteCampaignAttachment(deleteAttach.id)
      setDeleteAttach(null)
      load()
      setSnackbar({ open: true, message: 'Fichier supprimé.', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur : ${err.message}`, severity: 'error' })
    }
  }

  const statusOpt = STATUS_OPTIONS.find(s => s.value === campaign?.status)

  if (loading) return <LinearProgress />
  if (!campaign) return <Typography color="error">Campagne introuvable.</Typography>

  const successRate = campaign.totalRuns > 0
    ? Math.round((campaign.successRuns / campaign.totalRuns) * 100)
    : null

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/campaigns')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          {editing
            ? <TextField size="small" value={editName} onChange={e => setEditName(e.target.value)}
                sx={{ minWidth: 320 }} />
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
            : <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
                Modifier
              </Button>
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
                        {STATUS_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                      </TextField>
                    : <Box sx={{ mt: 0.5 }}>
                        <Chip
                          icon={campaign.status === 'IN_PROGRESS' ? <HourglassEmptyIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                          label={statusOpt?.label}
                          color={statusOpt?.color}
                          size="small" variant="outlined" sx={{ fontWeight: 600 }}
                        />
                      </Box>
                  }
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Date de MEP prévue</Typography>
                  {editing
                    ? <TextField fullWidth size="small" type="date" value={editRelease}
                        onChange={e => setEditRelease(e.target.value)} sx={{ mt: 0.5 }}
                        InputLabelProps={{ shrink: true }} />
                    : <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {campaign.targetReleaseDate ?? '—'}
                      </Typography>
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
            <CardContent sx={{ pb: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Runs associés ({campaign.totalRuns})
              </Typography>
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
                    <TableRow key={run.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/runs/${run.id}`)}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>#{run.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 120 }}>
                          {run.projectName ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: 200, display: 'block' }} noWrap>
                          {run.simulationClass}
                        </Typography>
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
                        <Tooltip title="Voir le run">
                          <IconButton size="small" onClick={e => { e.stopPropagation(); navigate(`/runs/${run.id}`) }}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

              {/* Upload zone */}
              <Box
                sx={{
                  border: '2px dashed', borderColor: attachFile ? 'primary.main' : 'divider',
                  borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer',
                  mb: 2, '&:hover': { borderColor: 'primary.light' },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" hidden
                  onChange={e => setAttachFile(e.target.files?.[0] || null)} />
                <UploadFileIcon sx={{ fontSize: 28, color: attachFile ? 'primary.main' : 'text.disabled' }} />
                {attachFile
                  ? <Typography variant="body2" fontWeight={600} noWrap>{attachFile.name}</Typography>
                  : <Typography variant="caption" color="text.secondary">Ajouter un fichier</Typography>
                }
              </Box>

              {attachFile && (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <TextField fullWidth size="small" label="Note (optionnelle)"
                    value={attachNote} onChange={e => setAttachNote(e.target.value)} />
                  <Button fullWidth variant="contained" size="small"
                    startIcon={<AttachFileIcon />}
                    onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Envoi...' : 'Associer'}
                  </Button>
                </Stack>
              )}

              <Divider sx={{ mb: 1.5 }} />

              {/* Liste des fichiers */}
              {campaign.attachments?.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 1 }}>
                  Aucune pièce jointe
                </Typography>
              )}
              <Stack spacing={1}>
                {campaign.attachments?.map(a => (
                  <Box key={a.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                    '&:hover': { borderColor: 'primary.main' },
                  }}>
                    <AttachFileIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="caption" fontWeight={600} noWrap display="block">
                        {a.originalFileName}
                      </Typography>
                      {a.note && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {a.note}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">
                        {a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} Ko` : ''} · {a.uploadedAt}
                      </Typography>
                    </Box>
                    <Tooltip title="Télécharger">
                      <IconButton size="small" color="primary"
                        onClick={() => window.open(a.downloadUrl, '_blank')}>
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

      {/* Dialog suppression fichier */}
      <Dialog open={!!deleteAttach} onClose={() => setDeleteAttach(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer le fichier ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>"{deleteAttach?.originalFileName}"</strong> sera définitivement supprimé.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAttach(null)} color="inherit">Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAttachment}>Supprimer</Button>
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