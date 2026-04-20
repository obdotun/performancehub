import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, LinearProgress, Avatar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PeopleIcon from '@mui/icons-material/People'
import { getUsers, createUser, deleteUser, toggleUser } from '../api/auth'
import dayjs from 'dayjs'

const ROLE_OPTIONS = ['VIEWER', 'PERF_ENGINEER', 'PERF_LEAD', 'ADMIN']
const ROLE_COLOR   = { ADMIN: 'error', PERF_LEAD: 'warning', PERF_ENGINEER: 'primary', VIEWER: 'default' }
const ROLE_LABEL   = { ADMIN: 'Admin', PERF_LEAD: 'Perf Lead', PERF_ENGINEER: 'Perf Engineer', VIEWER: 'Viewer' }

export default function UsersPage() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState({ username: '', fullName: '', role: 'PERF_ENGINEER' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const load = () => {
    setLoading(true)
    getUsers()
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async () => {
    if (!form.username || !form.fullName) { setError('Tous les champs sont requis'); return }
    setError(''); setSaving(true)
    try {
      await createUser(form)
      setOpen(false)
      setForm({ username: '', fullName: '', role: 'PERF_ENGINEER' })
      load()
    } catch (e) {
      setError(e.message ?? 'Erreur lors de la création')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, username) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return
    await deleteUser(id); load()
  }

  const handleToggle = async (id) => { await toggleUser(id); load() }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Utilisateurs</Typography>
            <Typography variant="body2" color="text.secondary">{users.length} compte(s)</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Nouvel utilisateur
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' } }}>
                <TableCell>UTILISATEUR</TableCell>
                <TableCell>NOM COMPLET</TableCell>
                <TableCell>RÔLE</TableCell>
                <TableCell>STATUT</TableCell>
                <TableCell>DERNIER LOGIN</TableCell>
                <TableCell>MOT DE PASSE</TableCell>
                <TableCell align="center">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: 13 }}>
                        {user.fullName?.[0] ?? '?'}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{user.username}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{user.fullName}</Typography></TableCell>
                  <TableCell>
                    <Chip label={ROLE_LABEL[user.role] ?? user.role} color={ROLE_COLOR[user.role] ?? 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={user.enabled ? 'Actif' : 'Désactivé'} color={user.enabled ? 'success' : 'default'}
                      size="small" variant={user.enabled ? 'filled' : 'outlined'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {user.lastLogin ? dayjs(user.lastLogin).format('DD/MM/YY HH:mm') : 'Jamais'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {user.mustChangePassword && <Chip label="À changer" color="warning" size="small" variant="outlined" />}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title={user.enabled ? 'Désactiver' : 'Activer'}>
                        <IconButton size="small" color={user.enabled ? 'warning' : 'success'} onClick={() => handleToggle(user.id)}>
                          {user.enabled ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" color="error" onClick={() => handleDelete(user.id, user.username)}>
                          <DeleteIcon fontSize="small" />
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

      <Alert severity="info" sx={{ mt: 2 }}>
        Mot de passe par défaut : <strong>Perfhub@2024</strong> — changement forcé à la première connexion.
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouvel utilisateur</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Nom d'utilisateur" fullWidth required
            value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          <TextField label="Nom complet" fullWidth required
            value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          <TextField label="Rôle" select fullWidth value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map(r => (
              <MenuItem key={r} value={r}>
                <Chip label={ROLE_LABEL[r]} color={ROLE_COLOR[r]} size="small" />
              </MenuItem>
            ))}
          </TextField>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info" sx={{ fontSize: '0.8rem' }}>Mot de passe initial : <strong>Perfhub@2024</strong></Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>{saving ? 'Création...' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}