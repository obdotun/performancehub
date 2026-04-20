import React from 'react'
import { Chip, CircularProgress, Box } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/HourglassEmpty'

const STATUS_MAP = {
  SUCCESS:   { label: 'Succès',      color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  FAILED:    { label: 'Échoué',      color: 'error',   icon: <CancelIcon sx={{ fontSize: 14 }} /> },
  RUNNING:   { label: 'En cours',    color: 'primary', icon: null },
  PENDING:   { label: 'En attente',  color: 'default', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  CANCELLED: { label: 'Annulé',      color: 'warning', icon: <CancelIcon sx={{ fontSize: 14 }} /> },
}

export default function StatusChip({ status, size = 'small' }) {
  const cfg = STATUS_MAP[status] ?? { label: status, color: 'default', icon: null }

  const icon = status === 'RUNNING'
    ? <CircularProgress size={12} color="inherit" />
    : cfg.icon

  return (
    <Chip
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {icon}
          {cfg.label}
        </Box>
      }
      color={cfg.color}
      size={size}
      variant={status === 'RUNNING' ? 'filled' : 'outlined'}
    />
  )
}
