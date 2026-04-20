import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, Avatar, IconButton, Tooltip, Divider, Chip,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderIcon from '@mui/icons-material/Folder'
import HistoryIcon from '@mui/icons-material/History'
import PeopleIcon from '@mui/icons-material/People'
import LogoutIcon from '@mui/icons-material/Logout'
import SpeedIcon from '@mui/icons-material/Speed'
import { useAuth } from '../context/AuthContext'

const DRAWER_WIDTH = 240

const ROLE_COLOR = {
  ADMIN: 'error',
  PERF_LEAD: 'warning',
  PERF_ENGINEER: 'primary',
  VIEWER: 'default',
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth, logout, hasRole } = useAuth()

  const navItems = [
    { label: 'Dashboard',  icon: <DashboardIcon />, path: '/',         minRole: 'VIEWER' },
    { label: 'Projets',    icon: <FolderIcon />,    path: '/projects', minRole: 'VIEWER' },
    { label: 'Historique', icon: <HistoryIcon />,   path: '/runs',     minRole: 'VIEWER' },
    { label: 'Utilisateurs',icon: <PeopleIcon />,   path: '/users',    minRole: 'ADMIN'  },
  ].filter(item => hasRole(item.minRole))

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: '1px solid rgba(48,54,61,0.8)',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SpeedIcon sx={{ color: '#000', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1, fontSize: '1.1rem' }}>PerfHub</Typography>
            <Typography variant="caption" color="text.secondary">Gatling Platform</Typography>
          </Box>
        </Box>
        <Divider />

        {/* Navigation */}
        <List sx={{ px: 1, pt: 1, flexGrow: 1 }}>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(0,176,255,0.12)',
                    color: 'primary.main',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider />
        {/* User info */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: 14 }}>
            {auth?.fullName?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap fontWeight={600}>{auth?.fullName}</Typography>
            <Chip
              label={auth?.role}
              size="small"
              color={ROLE_COLOR[auth?.role] ?? 'default'}
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Box>
          <Tooltip title="Déconnexion">
            <IconButton size="small" onClick={logout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(13,17,23,0.85)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(48,54,61,0.6)',
          }}
        >
          <Toolbar variant="dense">
            <Typography variant="body2" color="text.secondary">
              GUCE CI — Performance Testing Platform
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
