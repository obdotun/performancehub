import React, { useEffect, useRef } from 'react'
import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'

const LINE_COLOR = (line) => {
  if (!line) return '#8B949E'
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('❌') || l.includes('failed') || l.includes('ko')) return '#FF6B6B'
  if (l.includes('warn'))  return '#FFD600'
  if (l.includes('✅') || l.includes('success') || l.includes('ok')) return '#00E676'
  if (l.startsWith('[perfhub]')) return '#00B0FF'
  if (l.includes('simulation') || l.includes('gatling')) return '#CE93D8'
  return '#E6EDF3'
}

export default function LogConsole({ lines = [], title = 'Console', maxHeight = 500 }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  const handleCopy = () => {
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'gatling-run.log'
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{
      borderRadius: 2,
      border: '1px solid rgba(48,54,61,0.8)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', px: 2, py: 1,
        bgcolor: 'rgba(22,27,34,0.9)',
        borderBottom: '1px solid rgba(48,54,61,0.6)',
      }}>
        <Box sx={{ display: 'flex', gap: 0.6, mr: 1.5 }}>
          {['#FF5F57','#FFBD2E','#28CA41'].map(c => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          {title} ({lines.length} lignes)
        </Typography>
        <Tooltip title="Copier"><IconButton size="small" onClick={handleCopy}><ContentCopyIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
        <Tooltip title="Télécharger"><IconButton size="small" onClick={handleDownload}><DownloadIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
      </Box>

      {/* Log lines */}
      <Box sx={{
        bgcolor: '#0D1117',
        maxHeight,
        overflowY: 'auto',
        p: 1.5,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        fontSize: '0.76rem',
        lineHeight: 1.6,
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(139,148,158,0.3)', borderRadius: 3 },
      }}>
        {lines.length === 0
          ? <Typography color="text.secondary" variant="caption">En attente des logs...</Typography>
          : lines.map((line, i) => (
            <Box key={i} component="div" sx={{ color: LINE_COLOR(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <Box component="span" sx={{ color: '#484F58', userSelect: 'none', mr: 1.5, fontSize: '0.68rem' }}>
                {String(i + 1).padStart(4, ' ')}
              </Box>
              {line}
            </Box>
          ))
        }
        <div ref={bottomRef} />
      </Box>
    </Box>
  )
}
