import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'

export default function MetricCard({ label, value, unit = '', color = 'text.primary', icon }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700} color={color}>
              {value ?? '—'}
              {value != null && unit && (
                <Typography component="span" variant="body2" color="text.secondary" ml={0.5}>
                  {unit}
                </Typography>
              )}
            </Typography>
          </Box>
          {icon && (
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              bgcolor: 'rgba(0,176,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'primary.main',
            }}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
