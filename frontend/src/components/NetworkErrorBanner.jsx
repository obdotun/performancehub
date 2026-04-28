import React, { useState, useEffect } from 'react'
import { Alert, Collapse, Button, Box } from '@mui/material'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import RefreshIcon from '@mui/icons-material/Refresh'

/**
 * Bannière qui s'affiche automatiquement quand le backend est inaccessible.
 * Ping le backend toutes les 10s et affiche/masque selon la disponibilité.
 */
export default function NetworkErrorBanner() {
  const [offline, setOffline] = useState(false)
  const [checking, setChecking] = useState(false)

  const checkBackend = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000),
      })
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }

  useEffect(() => {
    // Vérifier la connectivité toutes les 15s
    const interval = setInterval(checkBackend, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleRetry = async () => {
    setChecking(true)
    await checkBackend()
    if (!offline) window.location.reload()
    setChecking(false)
  }

  if (!offline) return null

  return (
    <Collapse in={offline}>
      <Alert
        severity="warning"
        icon={<WifiOffIcon />}
        sx={{
          borderRadius: 0,
          position: 'sticky',
          top: 0,
          zIndex: 9999,
        }}
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            disabled={checking}
          >
            {checking ? 'Vérification...' : 'Réessayer'}
          </Button>
        }
      >
        Connexion perdue avec le serveur backend. Les opérations sont suspendues.
      </Alert>
    </Collapse>
  )
}