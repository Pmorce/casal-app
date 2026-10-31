// Scenarios for scripts/ui-check.mjs — one per plan task's manual verification.
export default {
  async shell({ login, shot, expectText }) {
    const { ctx, page } = await login('ana')
    await expectText(page, /^(Bom dia|Boa tarde|Boa noite), Ana$/, 'Ana sees greeting')
    await expectText(page, 'Congelador', 'tab bar visible')
    await ctx.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expectText(page, 'sem ligação', 'offline badge')
    await shot(page, 'shell')
  },

  // Task 9: pantry → list on the other phone; finish shopping moves it back to "Há" on both.
  async compras({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const a = await login('ana')
    const b = await login('rui')
    await a.page.goto(a.page.url().split('#')[0] + '#/casa')
    await a.page.getByPlaceholder('Nome (ex.: Leite)').fill('Café')
    await a.page.getByRole('button', { name: 'Despensa' }).click()
    await a.page.getByRole('button', { name: 'Adicionar' }).click()
    await expectText(a.page, 'Café', 'product created')
    await a.page.getByRole('button', { name: 'Falta Café' }).click()
    const card = title => a.page.locator('.card', { has: a.page.getByRole('heading', { name: title }) })
    await card(/Falta/).getByText('Café').waitFor({ timeout: 8000 })
    console.log('ok: Café under "Falta" on Ana’s phone')

    await b.page.goto(b.page.url().split('#')[0] + '#/compras')
    await b.page.getByRole('button', { name: 'Café', exact: true }).waitFor({ timeout: 8000 })
    console.log('ok: Rui sees Café on the list')
    await b.page.getByPlaceholder('+ Adicionar (ex.: Leite)').fill('cafe ')
    await b.page.getByRole('button', { name: 'Adicionar' }).click()
    await expectText(b.page, 'Já está na lista', 'duplicate blocked')
    await shot(b.page, 'compras-before')
    await b.page.getByRole('button', { name: 'Café', exact: true }).click()
    await b.page.getByRole('button', { name: /Terminar compras/ }).click()
    await expectText(b.page, 'Nada por comprar', 'list empty after finishing')

    await card(/Há/).getByText('Café').waitFor({ timeout: 8000 })
    console.log('ok: Café back under "Há" on Ana’s phone')
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
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Mais um saco', exact: true }).click()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expectText(page, '4 sacos · 8 un.', '4 bags · 8 units')
    const minus = page.getByRole('button', { name: 'Tirar um saco de Bifes de frango' })
    for (let i = 0; i < 3; i++) await minus.click()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expectText(page, '2 sacos · 4 un.', 'undo restores one bag')
    await minus.click(); await minus.click()
    await expectText(page, 'Acabou Bifes de frango', 'last bag asks about the list')
    await shot(page, 'congelador-ask')
    await page.getByRole('button', { name: 'Pôr na lista' }).click()
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
    await expectText(b.page, '2 de 2 feitos', 'morning counter 2 de 2')
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
    await expectText(a.page, 'Há (1)', 'Casa still on screen after registering')
  },

  // Congelador round: Terminar compras → Para o congelador (on screen) → Quanto foi → Dividir; no page errors.
  async congeladorCompras({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const { page } = await login('ana')
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    const base = page.url().split('#')[0]
    await page.goto(base + '#/casa')
    await page.getByPlaceholder('Nome (ex.: Leite)').fill('Carne de vaca')
    await page.getByRole('button', { name: 'Congelador' }).click()
    await page.getByRole('button', { name: 'Adicionar' }).click()
    await page.getByRole('button', { name: 'Falta Carne de vaca' }).click()

    await page.goto(base + '#/compras')
    await page.getByRole('button', { name: 'Carne de vaca', exact: true }).click()
    await page.getByRole('button', { name: /Terminar compras/ }).click()
    await page.waitForTimeout(700)
    const box = await page.getByText('Para o congelador').boundingBox()
    if (!box || box.y < 0 || box.y > 844) throw new Error(`"Para o congelador" off-screen: ${JSON.stringify(box)}`)
    console.log('ok: Para o congelador on screen')
    await shot(page, 'cc-1-congelador')
    await page.getByLabel('Quantidade de Carne de vaca').fill('5')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expectText(page, 'Quanto foi', 'then Quanto foi')
    await shot(page, 'cc-2-quanto-foi')
    await page.getByRole('button', { name: 'Agora não' }).click()

    await page.goto(base + '#/congelador')
    await expectText(page, '1 saco · 5 kg', 'one bag of 5 kg in the freezer')
    await page.getByText('Carne de vaca').click()
    await page.getByRole('button', { name: /^Dividir o saco 1/ }).click()
    await page.getByRole('button', { name: 'Dividir em 5' }).click()
    await expectText(page, '5 sacos · 5 kg', 'split in 5 bags')
    await shot(page, 'cc-3-dividido')

    await page.goto(base + '#/casa')
    await expectText(page, '5 sacos · 5 kg', 'Casa shows the bags')
    await shot(page, 'cc-4-casa')
    await page.goto(base + '#/compras')
    await page.getByPlaceholder('+ Adicionar (ex.: Leite)').fill('Pilhas')
    await page.getByRole('button', { name: 'Adicionar' }).click()
    await expectText(page, 'Onde fica', 'zone picker for a new name')
    await shot(page, 'cc-5-zonas')
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)
  },

  // Arrumação: the Android Back button in an editor with unsaved changes asks first; staying keeps the edits.
  async voltar({ login, shot, expectText }) {
    await (await import('./ui-admin.mjs')).resetDb()
    const { page } = await login('rui')
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    // tap through the app like a person: a page.goto() entry is not the router's, and the router cannot block a Back into it
    await page.getByRole('link', { name: /Mais/ }).click()
    await page.getByRole('link', { name: /Rotinas e checklists/ }).click()
    await page.getByRole('button', { name: '+ Nova rotina' }).click()
    await page.getByRole('button', { name: '+ Passo' }).click()
    await page.getByPlaceholder('Passo').fill('Beber água')

    const asked = []
    page.once('dialog', d => { asked.push(d.message()); d.dismiss() })
    await page.goBack()
    await page.waitForTimeout(500)
    if (asked[0] !== 'Tens alterações por guardar. Sair mesmo assim?') throw new Error(`Back did not ask: ${JSON.stringify(asked)}`)
    if (await page.getByPlaceholder('Passo').inputValue() !== 'Beber água') throw new Error('edits lost after staying')
    console.log('ok: Back asks, and "Cancelar" keeps the edits')
    await shot(page, 'voltar-ficou')

    page.once('dialog', d => d.accept())
    await page.goBack()
    await expectText(page, '+ Nova rotina', 'accepting leaves the editor')
    await shot(page, 'voltar-saiu')

    // Apagar goes back in history: no repeated Rotinas entry
    await page.getByRole('button', { name: '+ Nova rotina' }).click()
    await page.getByLabel('Nome').fill('Rotina a apagar')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.getByRole('button', { name: 'Editar' }).click()
    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Apagar rotina' }).click()
    await expectText(page, '+ Nova rotina', 'Apagar returns to the list')
    await page.goBack()
    await expectText(page, 'Rotinas e checklists', 'Back after Apagar lands on Mais, not on Rotinas again')
    await shot(page, 'voltar-apagou')

    // the header ‹ in a new item's editor asks, and leaves no editor behind for Back to reopen
    await page.getByRole('link', { name: /Rotinas e checklists/ }).click()
    await page.getByRole('button', { name: '+ Nova rotina' }).click()
    await page.getByRole('button', { name: '+ Passo' }).click()
    await page.getByPlaceholder('Passo').fill('Beber água')
    const askedBack = []
    page.once('dialog', d => { askedBack.push(d.message()); d.accept() })
    await page.getByRole('link', { name: 'Voltar a Rotinas' }).click()
    await expectText(page, '+ Nova rotina', 'the header ‹ leaves the new editor')
    if (askedBack[0] !== 'Tens alterações por guardar. Sair mesmo assim?') throw new Error(`‹ did not ask: ${JSON.stringify(askedBack)}`)
    page.on('dialog', d => { askedBack.push(d.message()); d.dismiss() })
    await page.goBack()
    await expectText(page, 'Rotinas e checklists', 'Back after ‹ lands on Mais, not on the discarded editor')
    if (askedBack.length !== 1 || await page.getByPlaceholder('Passo').count()) throw new Error('the discarded editor came back')

    // an existing item: ‹ from its editor still asks and returns to the list
    await page.getByRole('link', { name: /Rotinas e checklists/ }).click()
    await page.getByRole('button', { name: '+ Nova rotina' }).click()
    await page.getByLabel('Nome').fill('Rotina guardada')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Nome').fill('Rotina mudada')
    page.removeAllListeners('dialog')
    page.once('dialog', d => { askedBack.push(d.message()); d.accept() })
    await page.getByRole('link', { name: 'Voltar a Rotinas' }).click()
    await expectText(page, 'Rotina guardada', 'existing item: ‹ asks and returns to Rotinas')
    if (askedBack.length !== 2) throw new Error('existing item: ‹ did not ask')
    await shot(page, 'voltar-seta')
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)
  },

  // Task 5: two products "Leite" and two linked items, left by two offline phones -> merged in the background.
  async arrumacao({ login, shot, expectText }) {
    const { adminDb, resetDb } = await import('./ui-admin.mjs')
    await resetDb()
    await adminDb.collection('products').doc('a').set({ name: 'Leite', location: 'frigorifico' })
    await adminDb.collection('products').doc('b').set({ name: 'Leite', location: 'frigorifico', boughtKeys: ['2026-10-01', '2026-10-15'] })
    await adminDb.collection('shopping').doc('i1').set({ text: 'Leite', addedBy: 'ana', status: 'porComprar', productId: 'a' })
    await adminDb.collection('shopping').doc('i2').set({ text: 'Leite', addedBy: 'rui', status: 'porComprar', productId: 'b' })
    const { page } = await login('ana')
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.getByRole('link', { name: /Compras/ }).click()
    const leite = page.getByText('Leite', { exact: true })
    const pill = page.locator('.card-title', { hasText: 'Por comprar' }).locator('.pill')
    const t0 = Date.now()
    while (!((await leite.count()) === 1 && (await pill.textContent()) === '1')) {
      if (Date.now() - t0 > 15000) throw new Error(`not merged: ${await leite.count()} Leite, pill ${await pill.textContent()}`)
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(1500)
    if ((await leite.count()) !== 1 || (await pill.textContent()) !== '1') throw new Error('list changed after merging')
    await expectText(page, 'Frigorífico', 'list grouped under Frigorífico')
    console.log('ok: one "Leite" on the list')
    await shot(page, 'arrumacao-compras')
    await page.getByRole('link', { name: /Casa/ }).click()
    await page.locator('.row', { hasText: 'Leite' }).first().waitFor()
    const c = await page.locator('.row', { hasText: 'Leite' }).count()
    if (c !== 1) throw new Error(`expected one "Leite" in Casa, found ${c}`)
    console.log('ok: one "Leite" in Casa')
    await shot(page, 'arrumacao-casa')
    const [prods, items] = await Promise.all([adminDb.collection('products').get(), adminDb.collection('shopping').get()])
    if (prods.size !== 1 || prods.docs[0].id !== 'b' || items.size !== 1) throw new Error(`server not merged: ${prods.size} products, ${items.size} items`)
    console.log('ok: server holds product b with 1 item')
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)
  },

}
