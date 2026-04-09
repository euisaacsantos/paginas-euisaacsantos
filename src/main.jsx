import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppV1 from './AppV1.jsx'
import AppV2 from './AppV2.jsx'
import AppV3 from './AppV3.jsx'
import AppV4 from './AppV4.jsx'
import AppV5 from './AppV5.jsx'
import AppV6 from './AppV6.jsx'

const path = window.location.pathname
const Root =
  path.startsWith('/v6') ? AppV6 :
  path.startsWith('/v5') ? AppV5 :
  path.startsWith('/v4') ? AppV4 :
  path.startsWith('/v3') ? AppV3 :
  path.startsWith('/v2') ? AppV2 :
  path.startsWith('/v1') ? AppV1 :
  App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
