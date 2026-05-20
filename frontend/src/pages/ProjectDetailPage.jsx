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

  const [project, setProject] = useState(null)
  const [simulations, setSimulations] = useState([])
  const [runs, setRuns] = useState([])

  const [selectedSim, setSelectedSim] = useState('')
  const [selectedModule, setSelectedModule] = useState('')
  const [selectedEnv, setSelectedEnv] = useState('')

  const [users, setUsers] = useState(1)
  const [rampDuration, setRampDuration] = useState(10)
  const [extraParams, setExtraParams] = useState('')

  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')

  // 🔥 Parse simulation string
  const parseSimulation = (fullName) => {
    const parts = fullName.split('.')

    const module = parts[1] || 'unknown'
    const env = parts[2] || 'unknown'
    const rawName = parts[parts.length - 1]

    const cleanName = rawName
      .replace(/^GC_\d+_/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()

    return {
      module,
      env,
      name: cleanName,
      full: fullName
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [p, sims, r] = await Promise.all([
        getProject(id),
        getSimulations(id),
        getRunsByProject(id),
      ])

      const structured = (Array.isArray(sims) ? sims : []).map(parseSimulation)

      setProject(p)
      setSimulations(structured)
      setRuns(Array.isArray(r) ? r : [])

    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  // Extract modules & envs
  const modules = [...new Set(simulations.map(s => s.module))]
  const environments = [...new Set(simulations.map(s => s.env))]

  // Filter simulations
  const filteredSimulations = simulations.filter(s =>
    (!selectedModule || s.module === selectedModule) &&
    (!selectedEnv || s.env === selectedEnv)
  )

  const handleLaunch = async () => {
    if (!selectedSim) {
      setError('Sélectionnez une simulation')
      return
    }

    setError('')
    setLaunching(true)

    try {
      const payload = { simulationClass: selectedSim }

      const parsedUsers = parseInt(users)
      const parsedRamp = parseInt(rampDuration)

      if (!isNaN(parsedUsers) && parsedUsers > 0) payload.users = parsedUsers
      if (!isNaN(parsedRamp) && parsedRamp >= 0) payload.rampDuration = parsedRamp
      if (extraParams?.trim()) payload.extraParams = extraParams.trim()

      const run = await launchRun(id, payload)
      navigate(`/runs/${run.id}`)

    } catch (e) {
      setError(e.message ?? 'Erreur lors du lancement')
      setLaunching(false)
    }
  }

  const handlePull = async () => {
    const username = prompt('Username Bitbucket :')
    const token = prompt('Token d\'accès :')
    if (!username || !token) return
    try {
      await pullProject(id, { username, token })
      await load()
    } catch {
      setError('Erreur lors du pull')
    }
  }

  if (!id || isNaN(Number(id))) {
    return <Alert severity="error">ID de projet invalide : {id}</Alert>
  }

  if (loading) return <LinearProgress />
  if (error && !project) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <strong>Impossible de charger le projet</strong><br />{error}
      </Alert>
    )
  }

  if (!project) return <LinearProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/projects')} size="small">
          <ArrowBackIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={700}>{project?.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip label={project?.type} size="small" variant="outlined"
              color={project?.type === 'ZIP' ? 'primary' : 'warning'} />
            {project?.branch && <Chip label={`🌿 ${project.branch}`} size="small" />}
          </Box>
        </Box>

        {project?.type === 'BITBUCKET' && hasRole('PERF_LEAD') && (
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={handlePull} size="small">
            Pull
          </Button>
        )}

        <Tooltip title="Rafraîchir">
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {hasRole('PERF_ENGINEER') && (
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>

                <Typography variant="h6" gutterBottom>
                  <PlayArrowIcon color="primary" /> Lancer une simulation
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {simulations.length === 0 ? (
                  <Alert severity="warning">
                    Aucune classe de simulation trouvée.
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                    {/* Module */}
                    <TextField label="Module" select fullWidth
                      value={selectedModule}
                      onChange={e => {
                        setSelectedModule(e.target.value)
                        setSelectedSim('')
                      }}>
                      {modules.map(m => (
                        <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>
                      ))}
                    </TextField>

                    {/* Environment */}
                    <TextField label="Environnement" select fullWidth
                      value={selectedEnv}
                      onChange={e => {
                        setSelectedEnv(e.target.value)
                        setSelectedSim('')
                      }}>
                      {environments.map(env => (
                        <MenuItem key={env} value={env}>{env.toUpperCase()}</MenuItem>
                      ))}
                    </TextField>

                    {/* Simulation */}
                    <TextField label="Simulation" select fullWidth required
                      value={selectedSim}
                      onChange={e => setSelectedSim(e.target.value)}>
                      {filteredSimulations.map(s => (
                        <MenuItem key={s.full} value={s.full}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField label="Utilisateurs" type="number"
                        inputProps={{ min: 1 }}
                        value={users}
                        onChange={e => setUsers(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField label="Ramp (secondes)" type="number"
                        inputProps={{ min: 0 }}
                        value={rampDuration}
                        onChange={e => setRampDuration(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    </Box>

                    <TextField label="Paramètres supplémentaires"
                      fullWidth multiline rows={2}
                      value={extraParams}
                      onChange={e => setExtraParams(e.target.value)}
                    />

                    {error && <Alert severity="error">{error}</Alert>}

                    <Button variant="contained" size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleLaunch}
                      disabled={launching}>
                      {launching ? 'Lancement...' : 'Lancer la simulation'}
                    </Button>

                  </Box>
                )}

              </CardContent>
            </Card>
          </Grid>
        )}

        {/* RIGHT SIDE unchanged */}
        <Grid item xs={12} md={hasRole('PERF_ENGINEER') ? 7 : 12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Historique des simulations</Typography>
              <Divider sx={{ mb: 2 }} />

              {runs.map(run => (
                <Box key={run.id} onClick={() => navigate(`/runs/${run.id}`)}>
                  <Typography>{run.simulationClass}</Typography>
                </Box>
              ))}

            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  )
}