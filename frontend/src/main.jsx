import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { borderRadius: '12px', fontSize: '14px' },
        success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>
)
