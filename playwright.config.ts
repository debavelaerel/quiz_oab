import { defineConfig } from '@playwright/test'

// O e2e roda contra o `next dev` local, numa porta configurável (E2E_PORT),
// porque a 3000 costuma estar ocupada por outros projetos. Se já houver um
// `next dev` de pé nessa porta, ele é reutilizado. Defina ALLOW_HOJE_OVERRIDE=1
// no seu `.env.local` (o teste usa ?hoje=2026-09-30; o .env.example vem com ele
// vazio de propósito, porque NUNCA pode ir para produção) e deixe o stack local
// de pé (Supabase + `docker compose -p quiz-oab up`) — ver README.
const port = Number(process.env.E2E_PORT || 3100)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  retries: 0,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: `npx next dev -p ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
