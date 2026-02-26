import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔍 Vite loaded ENV:', {
    VITE_PRIMARY_COLOR: env.VITE_PRIMARY_COLOR,
    VITE_SIDEBAR_COLOR: env.VITE_SIDEBAR_COLOR,
  })

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_PRIMARY_COLOR': JSON.stringify(env.VITE_PRIMARY_COLOR),
      'import.meta.env.VITE_PRIMARY_LIGHT': JSON.stringify(env.VITE_PRIMARY_LIGHT),
      'import.meta.env.VITE_PRIMARY_HOVER': JSON.stringify(env.VITE_PRIMARY_HOVER),
      'import.meta.env.VITE_SIDEBAR_COLOR': JSON.stringify(env.VITE_SIDEBAR_COLOR),
      'import.meta.env.VITE_ACCENT_COLOR':  JSON.stringify(env.VITE_ACCENT_COLOR),
    }
  }
})