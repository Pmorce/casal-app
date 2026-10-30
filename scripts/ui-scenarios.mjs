// Scenarios for scripts/ui-check.mjs — one per plan task's manual verification.
export default {
  async shell({ login, shot, expectText }) {
    const { ctx, page } = await login('ana')
    await expectText(page, 'Olá Ana', 'Ana sees greeting')
    await expectText(page, 'Congelador', 'tab bar visible')
    await ctx.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expectText(page, 'sem ligação', 'offline badge')
    await shot(page, 'shell')
  },

  // Task 9: pantry → list on the other phone; finish shopping restores "Há" on both.
  async compras({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const a = await login('ana')
    const b = await login('rui')
    await a.page.goto(a.page.url().split('#')[0] + '#/casa')
    await a.page.getByPlaceholder('Nome (ex.: Leite)').fill('Café')
    await a.page.getByRole('button', { name: 'Despensa' }).click()
    await a.page.getByRole('button', { name: 'Adicionar' }).click()
    await expectText(a.page, 'Café', 'product created')
    await a.page.locator('.row', { hasText: 'Café' }).getByRole('button', { name: 'Acabou' }).click()

    await b.page.goto(b.page.url().split('#')[0] + '#/compras')
    await expectText(b.page, 'acabou', 'Rui sees Café flagged "acabou"')
    await b.page.getByPlaceholder('+ Adicionar (ex.: Leite)').fill('cafe ')
    await b.page.getByRole('button', { name: 'Adicionar' }).click()
    await expectText(b.page, 'Já está na lista', 'duplicate blocked')
    await shot(b.page, 'compras-before')
    await b.page.getByRole('button', { name: 'Café', exact: true }).click()
    await b.page.getByRole('button', { name: /Terminar compras/ }).click()
    await expectText(b.page, 'Nada por comprar', 'list empty after finishing')

    const haBtn = a.page.locator('.row', { hasText: 'Café' }).getByRole('button', { name: 'Há' })
    await haBtn.and(a.page.locator('.on')).waitFor({ timeout: 8000 })
    console.log('ok: Café back to "Há" on Ana\'s phone')
    await shot(a.page, 'casa-after')
  },

  // Task 10: register 4 bags, take some out, undo, last bag → offer to add to the list.
  async congelador({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const { page } = await login('ana')
    await page.goto(page.url().split('#')[0] + '#/congelador')
    await page.getByRole('button', { name: '+ Novo saco' }).click()
    await page.getByPlaceholder('ex.: Bifes de frango').fill('Bifes de frango')
    await page.getByPlaceholder('ex.: 2 ou 2,5').fill('abc')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expectText(page, 'Quantidade inválida', 'bad quantity rejected')
    await page.getByPlaceholder('ex.: 2 ou 2,5').fill('2')
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+', exact: true }).click()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expectText(page, '4 sacos · 8 un.', '4 bags · 8 units')
    const minus = page.getByRole('button', { name: 'Tirar um saco de Bifes de frango' })
    for (let i = 0; i < 3; i++) await minus.click()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expectText(page, '2 sacos · 4 un.', 'undo restores one bag')
    await minus.click(); await minus.click()
    await expectText(page, 'Adicionar à lista de compras?', 'last bag asks about the list')
    await shot(page, 'congelador-ask')
    await page.getByRole('button', { name: 'Sim' }).click()
    await page.goto(page.url().split('#')[0] + '#/compras')
    await expectText(page, 'Bifes de frango', 'item added to the shopping list')
  },

  // Task 11: Rui ticks 2 of today's steps; Ana sees them read-only; calendar shows "parcial".
  async rotinas({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const { adminDb } = await import('./ui-admin.mjs')
    const ALL = [0, 1, 2, 3, 4, 5, 6]
    await adminDb.doc('routines/rt1').set({
      ownerUid: 'rui', name: 'Rotina diária', order: 0, note: 'Beber água ao longo do dia',
      steps: [
        { id: 'a', text: 'Acordar + água', period: 'manha', days: ALL },
        { id: 'b', text: 'Pequeno-almoço', period: 'manha', days: ALL },
        { id: 'c', text: 'Revisão do dia', period: 'noite', days: ALL, note: 'preparar amanhã' },
      ],
    })
    const b = await login('rui')
    await expectText(b.page, 'Acordar + água', 'Rui sees today\'s steps')
    await b.page.getByRole('button', { name: 'Acordar + água' }).click()
    await b.page.getByRole('button', { name: 'Pequeno-almoço' }).click()
    await expectText(b.page, '2/2', 'morning counter 2/2')
    await shot(b.page, 'hoje-rui')

    const p = await login('ana')
    await p.page.goto(p.page.url().split('#')[0] + '#/mais/rotinas')
    await p.page.getByRole('button', { name: 'Rui' }).click()
    await p.page.getByText('Rotina diária').click()
    await expectText(p.page, 'só leitura', 'Ana sees Rui\'s routine read-only')
    if (await p.page.getByRole('button', { name: 'Editar' }).count()) throw new Error('Ana can edit Rui\'s routine')
    await p.page.locator('.cal .today.parcial').waitFor({ timeout: 8000 })
    console.log('ok: calendar marks today as parcial')
    await shot(p.page, 'rotina-ana-ve')
  },

  // Task 12: expenses with comma; one-off chore disappears and undo brings it back.
  async tarefas({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const { page } = await login('rui')
    const base = page.url().split('#')[0]
    await page.goto(base + '#/mais/gastos')
    await page.getByPlaceholder('Valor (ex.: 12,50)').fill('97')
    await page.getByRole('button', { name: 'Registar' }).click()
    await page.getByPlaceholder('Valor (ex.: 12,50)').fill('62,50')
    await page.getByRole('button', { name: 'Registar' }).click()
    await page.getByPlaceholder('Valor (ex.: 12,50)').fill('abc')
    await page.getByRole('button', { name: 'Registar' }).click()
    await expectText(page, 'Valor inválido', 'invalid value rejected')
    await expectText(page, '159,50', 'Rui total 159,50 €')
    await shot(page, 'gastos')

    await page.goto(base + '#/mais/tarefas')
    await page.getByPlaceholder('ex.: Aspirar a sala').fill('Trocar lâmpada')
    await page.getByRole('button', { name: 'Pontual' }).click()
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const tick = page.getByRole('button', { name: 'Trocar lâmpada', exact: true })
    await tick.waitFor({ timeout: 8000 })
    await tick.click()
    await expectText(page, 'feita por Rui', 'done by Rui recorded')
    if (await tick.count()) throw new Error('one-off chore still listed after ticking')
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await tick.waitFor({ timeout: 8000 })
    console.log('ok: undo brings the chore back')
    await shot(page, 'tarefas')
  },

  // Task 13: Hoje shows only today's weekday steps (fake clock: Tuesday vs Wednesday).
  async hoje({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const { adminDb } = await import('./ui-admin.mjs')
    await adminDb.doc('routines/skin').set({
      ownerUid: 'rui', name: 'Noite', order: 1,
      steps: [
        { id: 'ret', text: 'Passo de terça', period: 'noite', days: [2, 5] },
        { id: 'red', text: 'Passo de quarta', period: 'noite', days: [3] },
      ],
    })
    for (const [day, iso, want, notWant] of [
      ['terça', '2026-10-27T12:00:00Z', 'Passo de terça', 'Passo de quarta'],
      ['quarta', '2026-10-28T12:00:00Z', 'Passo de quarta', 'Passo de terça'],
    ]) {
      const { page } = await login('rui', iso)
      await expectText(page, want, `${day}: shows ${want}`)
      if (await page.getByText(notWant, { exact: true }).count()) throw new Error(`${day}: ${notWant} should not show`)
      await expectText(page, 'na lista', 'shopping summary')
      await shot(page, `hoje-${day}`)
    }
  },

  // Bug 2026-10-30: Casa → Comprei → Registar gasto → Registar left a black screen.
  async comprei({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const a = await login('ana')
    a.page.on('console', m => m.type() === 'error' && console.log('[console]', m.text()))
    await a.page.goto(a.page.url().split('#')[0] + '#/casa')
    await a.page.getByPlaceholder('Nome (ex.: Leite)').fill('Café')
    await a.page.getByRole('button', { name: 'Despensa' }).click()
    await a.page.getByRole('button', { name: 'Adicionar' }).click()
    await expectText(a.page, 'Café', 'product created')
    await a.page.getByRole('button', { name: 'Comprei Café' }).click()
    await a.page.waitForTimeout(400)
    await a.page.screenshot({ path: process.argv[3] + '/comprei-offer.png' })
    await a.page.getByRole('button', { name: 'Registar gasto' }).click()
    await a.page.getByPlaceholder('Valor (ex.: 47,30)').fill('3,20')
    await shot(a.page, 'comprei-before')
    await a.page.getByRole('button', { name: 'Registar', exact: true }).click()
    await a.page.waitForTimeout(1500)
    await shot(a.page, 'comprei-after')
    await expectText(a.page, '🟢 Há', 'Casa still on screen after registering')
  },
}
