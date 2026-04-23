import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Grid, Card, CardContent, Button,
  LinearProgress, Chip, Divider, IconButton, Tooltip, Alert, Tab, Tabs,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RefreshIcon from '@mui/icons-material/Refresh'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SpeedIcon from '@mui/icons-material/Speed'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { getRun, getRunLogs } from '../api/runs'
import { useRunWebSocket } from '../hooks/useRunWebSocket'
import StatusChip from '../components/StatusChip'
import LogConsole from '../components/LogConsole'
import MetricCard from '../components/MetricCard'
import dayjs from 'dayjs'

const REPORT_BASE         = 'http://localhost:8085/api/reports'
const PROJECT_REPORT_BASE = 'http://localhost:8085/api/project-reports'

export default function RunDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [run, setRun]           = useState(null)
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState(0)
  const [wsActive, setWsActive] = useState(false)

  const loadRun = useCallback(async () => {
    try {
      const data = await getRun(id)
      setRun(data)
      return data
    } catch { return null }
  }, [id])

  const loadLogs = useCallback(async () => {
    try {
      const data = await getRunLogs(id)
      setLogs(Array.isArray(data) ? data.map(l => l.line) : [])
    } catch {}
  }, [id])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadRun(), loadLogs()]).then(([data]) => {
      setLoading(false)
      if (data && (data.status === 'RUNNING' || data.status === 'PENDING')) {
        setWsActive(true)
      }
    })
  }, [id])

  useRunWebSocket(
    wsActive ? Number(id) : null,
    (line) => setLogs(prev => [...prev, line]),
    async () => {
      setWsActive(false)
      await loadRun()
      await loadLogs()
    }
  )

  useEffect(() => {
    if (!run || run.status !== 'RUNNING') return
    const interval = setInterval(loadRun, 5000)
    return () => clearInterval(interval)
  }, [run?.status])

  if (!id || isNaN(Number(id))) {
    return <Alert severity="error">ID de run invalide : {id}</Alert>
  }

  if (loading) return <LinearProgress />
  if (!run) return (
    <Alert severity="error" sx={{ m: 2 }}>
      Run introuvable ou accès refusé (ID : {id})
    </Alert>
  )

  // reportPath peut être :
  // - "run-1/simulation-name" → storage/reports/ (nouveau format)
  // - null → anciens runs : fallback via /api/project-reports/{runId}
  const reportUrl = run.reportPath
    ? `${REPORT_BASE}/${run.reportPath}/index.html`
    : run.status === 'SUCCESS'
      ? `${PROJECT_REPORT_BASE}/${run.id}/index.html`
      : null
  const duration  = run.durationSeconds
    ? `${Math.floor(run.durationSeconds / 60)}m ${run.durationSeconds % 60}s` : '—'
  const failRate  = run.totalRequests
    ? ((run.failedRequests / run.totalRequests) * 100).toFixed(1) : null

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ mt: 0.5 }}><ArrowBackIcon /></IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={700}>Run #{run.id}</Typography>
            <StatusChip status={run.status} size="medium" />
            {wsActive && (
              <Chip label="● Live" color="error" size="small"
                sx={{ animation: 'pulse 1.5s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
            {run.simulationClass}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Projet : <b>{run.project?.name}</b>
            {run.launchedBy && ` · Lancé par : ${run.launchedBy}`}
            {' · '}{dayjs(run.startedAt).format('DD/MM/YYYY HH:mm:ss')}
          </Typography>
        </Box>
        <Tooltip title="Rafraîchir">
          <IconButton onClick={() => { loadRun(); loadLogs() }}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Requêtes totales" value={run.totalRequests?.toLocaleString() ?? '—'} icon={<SpeedIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Requêtes KO" value={run.failedRequests?.toLocaleString() ?? '—'}
            color={run.failedRequests > 0 ? 'error.main' : 'success.main'} icon={<ErrorOutlineIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Temps de réponse moyen" value={run.meanResponseTime ?? '—'} unit="ms"
            color={run.meanResponseTime == null ? 'text.primary' : run.meanResponseTime < 500 ? 'success.main' : run.meanResponseTime < 2000 ? 'warning.main' : 'error.main'}
            icon={<AccessTimeIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard label="Durée" value={duration} icon={<CheckCircleOutlineIcon />} />
        </Grid>
      </Grid>

      {failRate !== null && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Taux d'erreur</Typography>
              <Typography variant="caption" fontWeight={700} color={parseFloat(failRate) > 5 ? 'error.main' : 'success.main'}>
                {failRate}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={Math.min(parseFloat(failRate), 100)}
              color={parseFloat(failRate) > 5 ? 'error' : 'success'} sx={{ height: 6, borderRadius: 3 }} />
          </CardContent>
        </Card>
      )}

      {run.errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{run.errorMessage}</Alert>}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={`Logs (${logs.length})`} />
            {reportUrl && <Tab label="Rapport Gatling" />}
          </Tabs>
        </Box>

        {tab === 0 && (
          <CardContent sx={{ p: 2 }}>
            <LogConsole lines={logs} title={`Simulation — Run #${id}`} maxHeight={520} />
          </CardContent>
        )}

        {tab === 1 && reportUrl && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, borderBottom: '1px solid rgba(48,54,61,0.4)' }}>
             {/*  <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => window.open(reportUrl, '_blank')}>
                Ouvrir dans un onglet
              </Button>*/}
            </Box>
            <iframe src={reportUrl} title="Gatling Report"
              style={{ width: '100%', height: '700px', border: 'none', borderRadius: '0 0 10px 10px', background: '#fff' }} />
          </Box>
        )}
      </Card>
    </Box>
  )
}