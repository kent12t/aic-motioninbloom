import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './style.css'

const rootNode = document.querySelector<HTMLDivElement>('#app')

if (!rootNode) {
  throw new Error('Missing #app root element.')
}

createRoot(rootNode).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
