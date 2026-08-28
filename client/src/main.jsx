import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* Fatal-error reporter: a crashed app must NEVER be a silent white page.
   IMPORTANT: this paints into a dedicated overlay OUTSIDE the React root.
   The old version wrote into #root while React still owned that DOM, so the
   next commit threw "Failed to execute 'removeChild' on 'Node'" (React's
   nodes had been pulled out from under it) and masked the real error. */
function ensureFatalOverlay() {
  let el = document.getElementById('fatal-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'fatal-overlay'
    document.body.appendChild(el)
  }
  return el
}

function showFatal(title, detail) {
  const el = ensureFatalOverlay()
  const esc = (s) =>
    String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
  el.innerHTML = `
    <div style="position:fixed;inset:0;z-index:99999;background:#fff;overflow:auto;font-family:Arial,sans-serif;padding:24px;max-width:920px;margin:0 auto;color:#050505">
      <h2 style="color:#e41e3f;margin:0 0 10px">⚠️ ${esc(title)}</h2>
      <pre style="white-space:pre-wrap;background:#f0f2f5;border:1px solid #e4e6eb;border-radius:8px;padding:16px;font-size:13px;line-height:1.55;overflow:auto">${esc(detail)}</pre>
      <p style="color:#65676b;font-size:14px">Copy everything in the box above when reporting this issue.</p>
    </div>`
}

window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver')) return // benign noise
  showFatal('JavaScript error', `${e.message}\n\nat ${e.filename}:${e.lineno}:${e.colno}\n\n${e.error?.stack || ''}`)
})
window.addEventListener('unhandledrejection', (e) => {
  showFatal('Unhandled promise rejection', e.reason?.stack || String(e.reason))
})

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(err, info) {
    // Report OUTSIDE the render phase and OUTSIDE the React root, deferred to
    // a macrotask so React can finish unwinding/unmounting the crashed tree
    // cleanly first (avoids the removeChild NotFoundError cascade).
    console.error('React render crash:', err, info)
    setTimeout(() => {
      showFatal(
        'React render error',
        `${err?.message || String(err)}\n\n${err?.stack || ''}`
      )
    }, 0)
  }
  render() {
    if (this.state.err) return null // overlay carries the message; React unmounts safely
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

