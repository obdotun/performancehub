import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, InputAdornment, IconButton,
} from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockReset'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { changePassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function ChangePasswordPage() {
  const navigate        = useNavigate()
  const { auth, login } = useAuth()

  const [form, setForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [show, setShow]       = useState({ current: false, newPwd: false, confirm: false })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const toggle = (key) => setShow(s => ({ ...s, [key]: !s[key] }))

  const eyeAdornment = (key) => (
    <InputAdornment position="end">
      <IconButton onClick={() => toggle(key)} edge="end" size="small">
        {show[key] ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères')
      return
    }
    setError('')
    setLoading(true)
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      login({ ...auth, mustChangePassword: false })
      navigate('/')
    } catch (err) {
      // Afficher le message exact du serveur pour faciliter le diagnostic
      if (err.network) {
        setError('Serveur inaccessible.')
      } else {
        setError(`Erreur ${err.status} : ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default',
    }}>
      <Card sx={{ width: '100%', maxWidth: 420, mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <LockResetIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6">Changer le mot de passe</Typography>
              <Typography variant="caption" color="text.secondary">
                'Modifiez votre mot de passe'
              </Typography>
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            <TextField
                label="Mot de passe actuel" fullWidth required
                type={show.current ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                InputProps={{ endAdornment: eyeAdornment('current') }}
              />

            <TextField
              label="Nouveau mot de passe (8 caractères min.)" fullWidth required
              type={show.newPwd ? 'text' : 'password'}
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              InputProps={{ endAdornment: eyeAdornment('newPwd') }}
            />

            <TextField
              label="Confirmer le nouveau mot de passe" fullWidth required
              type={show.confirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              InputProps={{ endAdornment: eyeAdornment('confirm') }}
            />

            <Button
              type="submit" variant="contained" size="large"
              disabled={loading || !form.currentPassword || !form.newPassword || !form.confirm}
              sx={{ mt: 1 }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}