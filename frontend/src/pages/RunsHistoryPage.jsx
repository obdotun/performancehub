import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, LinearProgress,
  TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
  Tooltip, InputAdornment, Button, Stack, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import SearchIcon        from '@mui/icons-material/Search'
import RefreshIcon       from '@mui/icons-material/Refresh'
import OpenInNewIcon     from '@mui/icons-material/OpenInNew'
import AssessmentIcon    from '@mui/icons-material/Assessment'
import CloseIcon         from '@mui/icons-material/Close'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import StopIcon          from '@mui/icons-material/Stop'
import ReplayIcon        from '@mui/icons-material/Replay'
import { getRunsPaged, cancelRun, rerunRun } from '../api/runs'
import { getCampaignsByRun } from '../api/campaigns'
import StatusChip from '../components/StatusChip'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

const STATUS_OPTIONS = ['TOUS', 'SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED']
const PAGE_SIZE_OPTIONS = [10, 20, 50]

/** Charge les campagnes de chaque run — Map<runId, [{id,name}]> */
function useRunCampaigns(runs) {
  const [campaignMap, setCampaignMap] = useState(new Map())
  useEffect(() => {
    if (!runs.length) return
    const map = new Map()
    Promise.allSettled(
      runs.map(r =>
        getCampaignsByRun(r.id).then(data => {
          if (Array.isArray(data) && data.length > 0) map.set(r.id, data)
        })
      )
    ).then(() => setCampaignMap(new Map(map)))
  }, [runs])
  return campaignMap
}

export default function RunsHistoryPage() {
  const navigate    = useNavigate()
  const { hasRole } = useAuth()
  const canAct      = hasRole('PERF_ENGINEER')

  // ── State ──────────────────────────────────────────────────────────────────
  const [runs, setRuns]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filtres
  const [search, setSearch]               = useState('')
  const [searchInput, setSearchInput]     = useState('')   // debounced
  const [statusFilter, setStatusFilter]   = useState('TOUS')
  const [dateFrom, setDateFrom]           = useState(null)
  const [dateTo, setDateTo]               = useState(null)

  // Pagination
  const [page, setPage]   = useState(0)
  const [size, setSize]   = useState(10)

  // Actions
  const [cancelTarget, setCancelTarget] = useState(null)
  const [rerunTarget, setRerunTarget]   = useState(null)
  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' })

  // ── Chargement ─────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    getRunsPaged(page, size, statusFilter, search)
      .then(data => {
        setRuns(data?.content ?? [])
        setTotalElements(data?.totalElements ?? 0)
        setTotalPages(data?.totalPages ?? 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, size, statusFilter, search])

  useEffect(load, [load])

  // Debounce search : attend 400ms après la frappe
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset page quand filtre change
  const handleStatusChange = (v) => { setStatusFilter(v); setPage(0) }
  const clearDateFilters   = ()  => { setDateFrom(null); setDateTo(null) }

  // Campagnes par run
  const campaignMap = useRunCampaigns(runs)

  // Stats (basées sur la page courante — le total vient du backend)
  const stats = {
    total:   totalElements,
    success: runs.filter(r => r.status === 'SUCCESS').length,
    failed:  runs.filter(r => r.status === 'FAILED').length,
    running: runs.filter(r => r.status === 'RUNNING').length,
  }

  // ── Actions cancel / rerun ─────────────────────────────────────────────────
  const handleCancel = async () => {
    try {
      await cancelRun(cancelTarget.id)
      setSnackbar({ open: true, message: `Run #${cancelTarget.id} annulé.`, severity: 'success' })
      setCancelTarget(null)
      load()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  const handleRerun = async () => {
    try {
      const newRun = await rerunRun(rerunTarget.id)
      setSnackbar({ open: true, message: `Nouveau run #${newRun.id} lancé.`, severity: 'success' })
      setRerunTarget(null)
      setPage(0)
      load()
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // ── Filtre date côté client (complémentaire au filtre serveur) ─────────────
  const filtered = runs.filter(r => {
    const runDate   = dayjs(r.startedAt)
    const matchFrom = !dateFrom || runDate.isAfter(dateFrom.subtract(1, 'day'))
    const matchTo   = !dateTo   || runDate.isBefore(dateTo.add(1, 'day'))
    return matchFrom && matchTo
  })

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Historique des simulations</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalElements} exécutions · {stats.success} succès · {stats.failed} échecs
            {stats.running > 0 && ` · ${stats.running} en cours`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FolderSpecialIcon />} size="small"
            onClick={() => navigate('/campaigns')}>
            Créer une campagne
          </Button>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Filtres ── */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Rechercher simulation, utilisateur..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              sx={{ minWidth: 300 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <TextField select size="small" label="Statut"
              value={statusFilter} onChange={e => handleStatusChange(e.target.value)}
              sx={{ minWidth: 140 }}>
              {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker label="Du" value={dateFrom} onChange={v => { setDateFrom(v); setPage(0) }}
                maxDate={dateTo ?? undefined}
                slotProps={{ textField: { size: 'small', sx: { minWidth: 170 } } }} />
              <DatePicker label="Au" value={dateTo} onChange={v => { setDateTo(v); setPage(0) }}
                minDate={dateFrom ?? undefined}
                slotProps={{ textField: { size: 'small', sx: { minWidth: 170 } } }} />
            </LocalizationProvider>
            {(dateFrom || dateTo) && (
              <Tooltip title="Effacer les filtres de date">
                <IconButton size="small" onClick={clearDateFilters}><CloseIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' } }}>
                <TableCell>#</TableCell>
                <TableCell>PROJET</TableCell>
                <TableCell>SIMULATION</TableCell>
                <TableCell>CAMPAGNE</TableCell>
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
              {filtered.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Aucune simulation trouvée.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(run => {
                const campaigns  = campaignMap.get(run.id) || []
                const isRunning  = run.status === 'RUNNING'
                const isPending  = run.status === 'PENDING'
                const isFinished = ['SUCCESS','FAILED','CANCELLED'].includes(run.status)

                return (
                  <TableRow key={run.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/runs/${run.id}`)}>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>#{run.id}</TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 130 }}>
                        {run.project?.name ?? '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', maxWidth: 200 }} noWrap>
                        {run.simulationClass}
                      </Typography>
                    </TableCell>

                    {/* Campagne(s) */}
                    <TableCell>
                      {campaigns.length === 0
                        ? <Typography variant="caption" color="text.disabled">—</Typography>
                        : <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {campaigns.map(c => (
                              <Tooltip key={c.id} title={c.name}>
                                <Chip
                                  icon={<FolderSpecialIcon />}
                                  label={c.name}
                                  size="small" variant="outlined" color="primary"
                                  sx={{ fontSize: '0.68rem', maxWidth: 130, cursor: 'pointer' }}
                                  onClick={e => { e.stopPropagation(); navigate(`/campaigns/${c.id}`) }}
                                />
                              </Tooltip>
                            ))}
                          </Stack>
                      }
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2">{run.totalRequests != null ? run.totalRequests.toLocaleString() : '—'}</Typography>
                    </TableCell>

                    <TableCell align="right">
                      {run.failedRequests != null
                        ? <Typography variant="body2" color={run.failedRequests > 0 ? 'error.main' : 'success.main'}>
                            {run.failedRequests.toLocaleString()}
                          </Typography>
                        : '—'}
                    </TableCell>

                    <TableCell align="right">
                      {run.meanResponseTime != null
                        ? <Chip label={`${run.meanResponseTime} ms`} size="small"
                            color={run.meanResponseTime < 500 ? 'success' : run.meanResponseTime < 2000 ? 'warning' : 'error'}
                            variant="outlined" />
                        : '—'}
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {run.durationSeconds != null
                          ? `${Math.floor(run.durationSeconds / 60)}m ${run.durationSeconds % 60}s`
                          : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{run.launchedBy ?? '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(run.startedAt).format('DD/MM/YY HH:mm')}
                      </Typography>
                    </TableCell>

                    <TableCell><StatusChip status={run.status} /></TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {run.reportPath && (
                          <Tooltip title="Rapport Gatling">
                            <IconButton size="small" color="primary"
                              onClick={e => { e.stopPropagation(); navigate(`/runs/${run.id}`) }}>
                              <AssessmentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Voir les logs">
                          <IconButton size="small"
                            onClick={e => { e.stopPropagation(); navigate(`/runs/${run.id}`) }}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Annuler — seulement si RUNNING ou PENDING */}
                        {canAct && (isRunning || isPending) && (
                          <Tooltip title="Annuler le run">
                            <IconButton size="small" color="error"
                              onClick={e => { e.stopPropagation(); setCancelTarget(run) }}>
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Relancer — seulement si terminé */}
                        {canAct && isFinished && (
                          <Tooltip title="Relancer avec les mêmes paramètres">
                            <IconButton size="small" color="primary"
                              onClick={e => { e.stopPropagation(); setRerunTarget(run) }}>
                              <ReplayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Pagination ── */}
        <TablePagination
          component="div"
          count={totalElements}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={size}
          onRowsPerPageChange={e => { setSize(parseInt(e.target.value, 10)); setPage(0) }}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          labelRowsPerPage="Lignes par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
        />
      </Card>

      {/* ── Dialog annulation ── */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Annuler le run ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Le run <strong>#{cancelTarget?.id}</strong> ({cancelTarget?.simulationClass}) sera arrêté immédiatement.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} color="inherit">Non</Button>
          <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={handleCancel}>
            Annuler le run
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog relance ── */}
      <Dialog open={!!rerunTarget} onClose={() => setRerunTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Relancer le run ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Un nouveau run sera lancé avec les mêmes paramètres :
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
            {rerunTarget?.simulationClass}
          </Typography>
          {rerunTarget?.users && (
            <Typography variant="caption" color="text.secondary" display="block">
              {rerunTarget.users} utilisateurs · {rerunTarget.rampDuration}s ramp
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRerunTarget(null)} color="inherit">Annuler</Button>
          <Button variant="contained" startIcon={<ReplayIcon />} onClick={handleRerun}>
            Relancer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
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