import React, { useEffect, useState } from 'react'
import { Grid, Typography, Box, Card, CardContent, LinearProgress, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import SpeedIcon from '@mui/icons-material/Speed'
import FolderIcon from '@mui/icons-material/Folder'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { getProjects } from '../api/projects'
import { getRuns } from '../api/runs'
import MetricCard from '../components/MetricCard'
import StatusChip from '../components/StatusChip'
import dayjs from 'dayjs'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [runs, setRuns]         = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getProjects(), getRuns()])
      .then(([p, r]) => {
        setProjects(Array.isArray(p) ? p : [])
        setRuns(Array.isArray(r) ? r : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const recentRuns   = runs.slice(0, 8)
  const successCount = runs.filter(r => r.status === 'SUCCESS').length
  const successRate  = runs.length ? Math.round((successCount / runs.length) * 100) : null

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Dashboard</Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Projets Gatling" value={projects.length} color="primary.main" icon={<FolderIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Simulations lancées" value={runs.length} color="text.primary" icon={<SpeedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Succès" value={successCount} color="success.main" icon={<CheckCircleIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Taux de succès" value={successRate} unit="%" color="primary.light" icon={<CheckCircleIcon />} />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Dernières simulations</Typography>
            <Button size="small" onClick={() => navigate('/runs')}>Voir tout</Button>
          </Box>
          {recentRuns.length === 0 && !loading && (
            <Typography color="text.secondary" variant="body2" textAlign="center" py={3}>
              Aucune simulation lancée. <Button size="small" onClick={() => navigate('/projects')}>Créer un projet</Button>
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recentRuns.map(run => (
              <Box key={run.id} onClick={() => navigate(`/runs/${run.id}`)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2,
                  cursor: 'pointer', border: '1px solid rgba(48,54,61,0.5)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'primary.main' },
                  transition: 'all 0.2s',
                }}>
                <PlayArrowIcon fontSize="small" color="primary" />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>{run.project?.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{run.simulationClass}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {run.totalRequests != null && (
                    <Typography variant="caption" color="text.secondary">{run.totalRequests.toLocaleString()} req</Typography>
                  )}
                  {run.meanResponseTime != null && (
                    <Typography variant="caption" color="text.secondary">{run.meanResponseTime} ms</Typography>
                  )}
                  <StatusChip status={run.status} />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 110 }}>
                    {dayjs(run.startedAt).format('DD/MM/YY HH:mm')}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}