import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, LinearProgress,
  TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
  Tooltip, InputAdornment,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { getRuns } from '../api/runs'
import StatusChip from '../components/StatusChip'
import dayjs from 'dayjs'

const STATUS_OPTIONS = ['TOUS', 'SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED']

export default function RunsHistoryPage() {
  const navigate = useNavigate()
  const [runs, setRuns]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('TOUS')

  const load = () => {
    setLoading(true)
    getRuns()
      .then(data => setRuns(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = runs.filter(r => {
    const matchStatus = statusFilter === 'TOUS' || r.status === statusFilter
    const matchSearch = !search ||
      r.simulationClass?.toLowerCase().includes(search.toLowerCase()) ||
      r.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.launchedBy?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const stats = {
    total:   runs.length,
    success: runs.filter(r => r.status === 'SUCCESS').length,
    failed:  runs.filter(r => r.status === 'FAILED').length,
    running: runs.filter(r => r.status === 'RUNNING').length,
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Historique des simulations</Typography>
          <Typography variant="body2" color="text.secondary">
            {stats.total} exécutions · {stats.success} succès · {stats.failed} échecs
            {stats.running > 0 && ` · ${stats.running} en cours`}
          </Typography>
        </Box>
        <Tooltip title="Rafraîchir"><IconButton onClick={load}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Rechercher simulation, projet, utilisateur..."
              value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 320 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <TextField select size="small" label="Statut" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}>
              {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' } }}>
                <TableCell>#</TableCell>
                <TableCell>PROJET</TableCell>
                <TableCell>SIMULATION</TableCell>
                <TableCell align="right">REQUÊTES</TableCell>
                <TableCell align="right">KO</TableCell>
                <TableCell align="right">TEMPS MOY.</TableCell>
                <TableCell align="right">DURÉE</TableCell>
                <TableCell>LANCÉ PAR</TableCell>
                <TableCell>DATE</TableCell>
                <TableCell>STATUT</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Aucune simulation trouvée.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(run => (
                <TableRow key={run.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/runs/${run.id}`)}>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>#{run.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 140 }}>{run.project?.name ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', maxWidth: 220 }} noWrap>
                      {run.simulationClass}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{run.totalRequests != null ? run.totalRequests.toLocaleString() : '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {run.failedRequests != null
                      ? <Typography variant="body2" color={run.failedRequests > 0 ? 'error.main' : 'success.main'}>{run.failedRequests.toLocaleString()}</Typography>
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {run.meanResponseTime != null
                      ? <Chip label={`${run.meanResponseTime} ms`} size="small"
                          color={run.meanResponseTime < 500 ? 'success' : run.meanResponseTime < 2000 ? 'warning' : 'error'} variant="outlined" />
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">
                      {run.durationSeconds != null ? `${Math.floor(run.durationSeconds / 60)}m ${run.durationSeconds % 60}s` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{run.launchedBy ?? '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{dayjs(run.startedAt).format('DD/MM/YY HH:mm')}</Typography></TableCell>
                  <TableCell><StatusChip status={run.status} /></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {run.reportPath && (
                        <Tooltip title="Rapport Gatling">
                          <IconButton size="small" color="primary" onClick={e => { e.stopPropagation(); navigate(`/runs/${run.id}`) }}>
                            <AssessmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Voir les logs">
                        <IconButton size="small" onClick={e => { e.stopPropagation(); navigate(`/runs/${run.id}`) }}>
                          <OpenInNewIcon fontSize="small" />
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
    </Box>
  )
}