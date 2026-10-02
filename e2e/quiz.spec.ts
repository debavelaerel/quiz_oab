import { expect, test, type Page } from '@playwright/test'

// Caminho feliz completo contra o stack local (Supabase + MinIO + serviço de
// PDF + Mailpit + `next dev`): intro → nome → formado → nunca fez → demais perguntas
// (primeira opção; nas de múltipla escolha, uma opção + Continuar) → parte 2 →
// 5 questões do teste → dados → resultado (sem botões de WhatsApp/download, só o aviso).
// Usa ?hoje=2026-09-30: exige ALLOW_HOJE_OVERRIDE=1 no .env.local (só local/e2e,
// NUNCA em produção — o .env.example traz a variável vazia).

const passo = (page: Page) => page.locator('main p.step').first()

/** Responde a pergunta da tela atual e espera a tela mudar. */
async function responderPergunta(page: Page) {
  const antes = await passo(page).textContent()
  const continuar = page.getByRole('button', { name: 'Continuar', exact: true })
  await page.locator('main button.opt').first().click()
  // Múltipla escolha: marcar não avança, precisa do "Continuar".
  if (await continuar.isVisible()) await continuar.click()
  await expect
    .poll(async () => (await passo(page).isVisible()) ? await passo(page).textContent() : '(sem passo)')
    .not.toBe(antes)
}

test('caminho feliz: quiz → resultado com aviso do WhatsApp (sem botões)', async ({ page }) => {
  await page.goto('/?hoje=2026-09-30')
  await page.getByRole('button', { name: 'Descobrir a minha OAB' }).click()

  // Nome primeiro.
  await page.getByLabel('Seu nome').fill('Maria')
  await page.getByRole('button', { name: /Começar o quiz/ }).click()
  await expect(page.getByRole('heading', { name: /Pra começar, Maria:/ })).toBeVisible()

  // Formado e nunca fez a prova.
  await expect(passo(page)).toHaveText(/^Pergunta 1 de/)
  await page.getByRole('button', { name: /^Já me formei/ }).click()
  await expect(passo(page)).toHaveText(/^Pergunta 2 de/)
  await page.getByRole('button', { name: 'Ainda não, vai ser a primeira' }).click()
  await expect(passo(page)).toHaveText(/^Pergunta 3 de/)

  // Demais perguntas da parte 1, até a tela da parte 2.
  const comecarTeste = page.getByRole('button', { name: 'Começar o teste' })
  for (let i = 0; i < 20 && !(await comecarTeste.isVisible()); i++) {
    await responderPergunta(page)
  }
  await expect(comecarTeste).toBeVisible()
  await comecarTeste.click()

  // Teste de nível: 5 questões, primeira alternativa e confirmar.
  for (let q = 1; q <= 5; q++) {
    await expect(passo(page)).toHaveText(new RegExp(`^Questão ${q} de 5`))
    await page.locator('main button.opt.alt').first().click()
    await page.getByRole('button', { name: /^Confirmar e (seguir|ver o resultado)$/ }).click()
  }

  // Contato (e-mail único por execução), WhatsApp primeiro.
  await expect(page.getByRole('heading', { name: /^Maria, deixe seu e-mail e WhatsApp/ })).toBeVisible()
  await page.getByLabel('WhatsApp').fill('85999990000')
  await page.getByLabel('E-mail').fill(`maria+${Date.now()}@exemplo.com`)
  await page.getByRole('button', { name: /Ver o meu resultado agora/ }).click()

  // Resultado: a OAB recomendada é uma das três de 2027.
  await expect(page.getByText(/a OAB da sua aprovação é a/)).toBeVisible()
  await expect(page.locator('.big .num')).toHaveText(/^(48|49|50)$/)
  await expect(page.getByText(/^Maria, a OAB da sua aprovação é a/)).toBeVisible()

  // Sem botão de WhatsApp nem de download: só o aviso de que o time envia o resultado pelo WhatsApp.
  await expect(page.getByText('Nossa equipe vai te enviar o seu resultado no WhatsApp')).toBeVisible()
  await expect(page.locator('a.cta.wa')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Baixar meu diagnóstico/ })).toHaveCount(0)
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0)
})
