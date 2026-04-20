import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, InputAdornment, IconButton,
} from '@mui/material'
import SpeedIcon from '@mui/icons-material/Speed'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { login as apiLogin } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  // Nettoyer toute donnée d'auth corrompue au chargement
  React.useEffect(() => {
    const stored = localStorage.getItem('perfhub_auth')
    if (stored === 'undefined' || stored === 'null') {
      localStorage.removeItem('perfhub_auth')
    }
  }, [])
  const [form, setForm]     = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiLogin(form)

      // Succès
      login(data)
      navigate(data.mustChangePassword ? '/change-password' : '/')

    } catch (err) {
      if (err.network) {
        setError('Impossible de contacter le serveur. Vérifiez que le backend est démarré sur le port 8085.')
      } else if (err.status === 401 || err.status === 403) {
        setError('Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.')
      } else {
        setError(`Erreur : ${err.message || 'Inconnue'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(0,176,255,0.06) 0%, transparent 70%)',
    }}>
      <Card sx={{ width: '100%', maxWidth: 400, mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: 3,
              bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
            }}>
              <SpeedIcon sx={{ color: '#000', fontSize: 30 }} />
            </Box>
            <Typography variant="h5">PerfHub</Typography>
            <Typography variant="body2" color="text.secondary">Gatling Performance Platform</Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom d'utilisateur" fullWidth autoFocus required
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
            <TextField
              label="Mot de passe" fullWidth required
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwd(v => !v)} edge="end" size="small">
                      {showPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit" variant="contained" size="large"
              disabled={loading || !form.username || !form.password}
              sx={{ mt: 1 }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}