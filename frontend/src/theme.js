import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#00B0FF', light: '#69E2FF', dark: '#0081CB' },
    secondary: { main: '#FF6D00', light: '#FF9E40', dark: '#C43C00' },
    success:   { main: '#00E676' },
    error:     { main: '#FF1744' },
    warning:   { main: '#FFD600' },
    background: {
      default: '#0D1117',
      paper:   '#161B22',
    },
    text: {
      primary:   '#E6EDF3',
      secondary: '#8B949E',
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(48,54,61,0.8)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
})

export default theme
