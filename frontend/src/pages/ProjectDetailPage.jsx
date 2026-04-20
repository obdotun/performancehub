import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Button, Grid, Card, CardContent,
  TextField, MenuItem, LinearProgress, Alert, Chip,
  Divider, IconButton, Tooltip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SyncIcon from '@mui/icons-material/Sync'
import { getProject, getSimulations, pullProject } from '../api/projects'
import { getRunsByProject, launchRun } from '../api/runs'
import StatusChip from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()

  const [project, setProject]         = useState(null)
  const [simulations, setSimulations] = useState([])
  const [runs, setRuns]               = useState([])
  const [selectedSim, setSelectedSim] = useState('')
  const [extraParams, setExtraParams] = useState('')
  const [loading, setLoading]         = useState(true)
  const [launching, setLaunching]     = useState(false)
  const [error, setError]             = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [p, sims, r] = await Promise.all([
        getProject(id), getSimulations(id), getRunsByProject(id),
      ])
      setProject(p)
      setSimulations(Array.isArray(sims) ? sims : [])
      setRuns(Array.isArray(r) ? r : [])
      if (Array.isArray(sims) && sims.length > 0 && !selectedSim) setSelectedSim(sims[0])
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleLaunch = async () => {
    if (!selectedSim) { setError('Sélectionnez une simulation'); return }
    setError(''); setLaunching(true)
    try {
      const run = await launchRun(id, { simulationClass: selectedSim, extraParams })
      navigate(`/runs/${run.id}`)
    } catch (e) {
      setError(e.message ?? 'Erreur lors du lancement')
      setLaunching(false)
    }
  }

  const handlePull = async () => {
    const username = prompt('Username Bitbucket :')
    const token    = prompt('Token d\'accès :')
    if (!username || !token) return
    try { await pullProject(id, { username, token }); await load() }
    catch { setError('Erreur lors du pull') }
  }

  // Valider que l'ID est numérique avant tout appel API
  if (!id || isNaN(Number(id))) {
    return <Alert severity="error">ID de projet invalide : {id}</Alert>
  }

  if (loading) return <LinearProgress />
  if (error && !project) return (
    <Alert severity="error" sx={{ m: 2 }}>
      <strong>Impossible de charger le projet</strong><br />{error}
    </Alert>
  )
  if (!project) return <LinearProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/projects')} size="small"><ArrowBackIcon /></IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={700}>{project?.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip label={project?.type} size="small" variant="outlined" color={project?.type === 'ZIP' ? 'primary' : 'warning'} />
            {project?.branch && <Chip label={`🌿 ${project.branch}`} size="small" />}
          </Box>
        </Box>
        {project?.type === 'BITBUCKET' && hasRole('PERF_LEAD') && (
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={handlePull} size="small">Pull</Button>
        )}
        <Tooltip title="Rafraîchir"><IconButton onClick={load}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      <Grid container spacing={3}>
        {hasRole('PERF_ENGINEER') && (
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlayArrowIcon color="primary" /> Lancer une simulation
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {simulations.length === 0 ? (
                  <Alert severity="warning">
                    Aucune classe de simulation trouvée.<br />
                    Vérifiez que les fichiers .java sont dans src/gatling/java/
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField label="Classe de simulation" select fullWidth required
                      value={selectedSim} onChange={e => setSelectedSim(e.target.value)}>
                      {simulations.map(s => (
                        <MenuItem key={s} value={s}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{s}</Typography>
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Paramètres supplémentaires (optionnel)"
                      placeholder="-DusersCount=100 -DrampDuration=60"
                      fullWidth multiline rows={2}
                      value={extraParams} onChange={e => setExtraParams(e.target.value)}
                      helperText="Paramètres Java/Gatling supplémentaires" />
                    {error && <Alert severity="error">{error}</Alert>}
                    <Button variant="contained" size="large" startIcon={<PlayArrowIcon />}
                      onClick={handleLaunch} disabled={launching} sx={{ py: 1.5 }}>
                      {launching ? 'Lancement...' : 'Lancer la simulation'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={hasRole('PERF_ENGINEER') ? 7 : 12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Historique des simulations</Typography>
              <Divider sx={{ mb: 2 }} />
              {runs.length === 0 && (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  Aucune simulation lancée sur ce projet.
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {runs.map(run => (
                  <Box key={run.id} onClick={() => navigate(`/runs/${run.id}`)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                      borderRadius: 2, cursor: 'pointer', border: '1px solid rgba(48,54,61,0.5)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'primary.main' },
                      transition: 'all 0.2s',
                    }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ fontFamily: 'monospace' }}>
                        {run.simulationClass}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(run.startedAt).format('DD/MM/YYYY HH:mm')}
                        {run.launchedBy && ` · ${run.launchedBy}`}
                        {run.durationSeconds && ` · ${run.durationSeconds}s`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, alignItems: 'center' }}>
                      {run.totalRequests != null && (
                        <Typography variant="caption" color="text.secondary">
                          {run.totalRequests.toLocaleString()} req
                        </Typography>
                      )}
                      {run.meanResponseTime != null && (
                        <Chip label={`${run.meanResponseTime}ms`} size="small" variant="outlined" />
                      )}
                      <StatusChip status={run.status} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}