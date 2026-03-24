'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool, getObjects } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

describe('box tool — Esc behaviour', () => {
  test('Esc during drawing discards the box', async () => {
    // Regression: box keydown handled 'Esc' (wrong key name — should be 'Escape')
    // and called cursorUp() (which commits) instead of cancel().
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')

    await page.mouse.move(200, 200)
    await page.mouse.down()
    await page.mouse.move(400, 350)
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const objs = await getObjects(page)
    assert.equal(objs.length, 0, 'Esc during box drawing should discard the box')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
