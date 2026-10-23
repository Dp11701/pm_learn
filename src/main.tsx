import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles/app.css'
import { router } from './app/router'

const goc = document.getElementById('root')
if (!goc) throw new Error('Không tìm thấy #root')

createRoot(goc).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
