import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import './index.css'

const theme = createTheme({
  palette: { mode: 'light' },
  shape: { borderRadius: 8 },
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
