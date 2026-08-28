import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // If 5173 is taken, FAIL LOUDLY instead of silently hopping to 5174/5175.
    // A silent hop means the browser tab on :5173 shows a stale/broken app
    // (the "white screen" bug) while the real app runs somewhere else.
    strictPort: true,
    // Always launch the browser at the correct URL automatically.
    open: true,
  },
})

