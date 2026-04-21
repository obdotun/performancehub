import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Grid, Card, CardContent, CardActions,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, ToggleButtonGroup, ToggleButton,
  LinearProgress, Alert, IconButton, Tooltip,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import GitHubIcon from '@mui/icons-material/GitHub'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { getProjects, createFromZip, createFromBitbucket, deleteProject, listBranches } from '../api/projects'
import { useAuth } from '../context/AuthContext'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(false)
  const [type, setType]         = useState('ZIP')
  const [form, setForm]         = useState({ name: '', description: '', repoUrl: '', branch: '', username: '', token: '' })
  const [zipFile, setZipFile]   = useState(null)
  const [branches, setBranches] = useState([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const load = () => {
    setLoading(true)
    getProjects()
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const fetchBranches = async () => {
    if (!form.repoUrl || !form.username || !form.token) {
      setError('Veuillez renseigner l\'URL, le nom d\'utilisateur et le token avant de récupérer les branches.')
      return
    }
    setError('')
    try {
      const data = await listBranches({ repoUrl: form.repoUrl, username: form.username, token: form.token })
      const list = Array.isArray(data) ? data : []
      setBranches(list)
      if (list.length > 0) setForm(f => ({ ...f, branch: f.branch || list[0] }))
    } catch (e) {
      setError(e.message ?? 'Impossible de récupérer les branches. Vérifiez vos credentials et l\'URL.')
      setBranches([])
    }
  }

  const handleSubmit = async () => {
    setError(''); setSaving(true)
    try {
      if (type === 'ZIP') {
        if (!zipFile) { setError('Veuillez sélectionner un fichier ZIP'); setSaving(false); return }
        await createFromZip(form.name, form.description, zipFile)
      } else {
        await createFromBitbucket({ ...form, type: 'BITBUCKET' })
      }
      setOpen(false)
      setForm({ name: '', description: '', repoUrl: '', branch: '', username: '', token: '' })
      setZipFile(null); setBranches([]); load()
    } catch (e) {
      setError(e.message ?? 'Erreur lors de la création')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce projet et tous ses runs ?')) return
    await deleteProject(id); load()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Projets Gatling</Typography>
        {hasRole('PERF_LEAD') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Nouveau projet
          </Button>
        )}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {projects.length === 0 && !loading && (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <FolderZipIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">Aucun projet. Créez-en un pour commencer.</Typography>
        </Card>
      )}

      <Grid container spacing={2}>
        {projects.map(p => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Card sx={{ cursor: 'pointer', height: '100%', '&:hover': { borderColor: 'primary.main' }, transition: 'border-color 0.2s' }}
              onClick={() => navigate(`/projects/${p.id}`)}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2,
                    bgcolor: p.type === 'ZIP' ? 'rgba(0,176,255,0.1)' : 'rgba(255,109,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {p.type === 'ZIP' ? <FolderZipIcon color="primary" /> : <GitHubIcon sx={{ color: '#FF6D00' }} />}
                  </Box>
                  <Chip label={p.type} size="small" variant="outlined" color={p.type === 'ZIP' ? 'primary' : 'warning'} />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>{p.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {p.description || 'Pas de description'}
                </Typography>
                {p.branch && <Chip label={`🌿 ${p.branch}`} size="small" sx={{ fontSize: '0.7rem' }} />}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
                <Button size="small" startIcon={<OpenInNewIcon />}
                  onClick={e => { e.stopPropagation(); navigate(`/projects/${p.id}`) }}>
                  Ouvrir
                </Button>
                {hasRole('PERF_LEAD') && (
                  <Tooltip title="Supprimer">
                    <IconButton size="small" color="error" onClick={e => handleDelete(p.id, e)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau projet Gatling</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <ToggleButtonGroup value={type} exclusive onChange={(_, v) => v && setType(v)} fullWidth size="small">
            <ToggleButton value="ZIP"><FolderZipIcon sx={{ mr: 1 }} />Fichier ZIP</ToggleButton>
            <ToggleButton value="BITBUCKET"><GitHubIcon sx={{ mr: 1 }} />Bitbucket</ToggleButton>
          </ToggleButtonGroup>

          <TextField label="Nom du projet" fullWidth required
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Description" fullWidth multiline rows={2}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

          {type === 'ZIP' ? (
            <Button variant="outlined" component="label" startIcon={<FolderZipIcon />}>
              {zipFile ? zipFile.name : 'Sélectionner le ZIP du projet Gatling'}
              <input type="file" accept=".zip" hidden onChange={e => setZipFile(e.target.files[0])} />
            </Button>
          ) : (
            <>
              <TextField label="URL du dépôt Bitbucket" fullWidth required
                value={form.repoUrl} onChange={e => setForm(f => ({ ...f, repoUrl: e.target.value }))} />
              <TextField label="Nom d'utilisateur / Email" fullWidth
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              <TextField label="Token d'accès HTTP" fullWidth type="password"
                value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="Branche" fullWidth select SelectProps={{ native: true }}
                  value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                  {branches.length === 0
                    ? <option value="">— Récupérer les branches —</option>
                    : branches.map(b => <option key={b} value={b}>{b}</option>)}
                </TextField>
                <Button variant="outlined" onClick={fetchBranches} sx={{ flexShrink: 0 }}>
                  <RefreshIcon />
                </Button>
              </Box>
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Création...' : 'Créer le projet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}