'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool, getObjects } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

describe('text tool — insert / overwrite mode', () => {
  test('Insert key toggles insertMode flag', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'TextTool')

    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)

    const before = await page.evaluate(() =>
      window.ascii_design.paper.eventHandler.insertMode ?? true)
    assert.equal(before, true, 'starts in insert mode')

    await page.keyboard.press('Insert')
    await page.waitForTimeout(50)

    const after = await page.evaluate(() =>
      window.ascii_design.paper.eventHandler.insertMode)
    assert.equal(after, false, 'Insert key should switch to overwrite mode')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('typing in insert mode shifts existing characters right', async () => {
    // Type 'bc', move cursor back to 'b', switch to insert, type 'a' → 'abc'
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'TextTool')

    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)
    await page.keyboard.type('bc')
    await page.waitForTimeout(50)

    // Move cursor back to the start of 'bc'
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(50)

    // Already in insert mode (default) — type 'a'
    await page.keyboard.type('a')
    await page.waitForTimeout(50)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const chars = await page.evaluate(() => {
      const obj = window.ascii_design.paper.allObjects()
        .find(o => o.constructor.name === 'Text')
      if (!obj) return ''
      return obj.lines[0] ?? ''
    })

    assert.equal(chars, 'abc', `insert mode should shift chars right; got '${chars}'`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('text tool — edit existing text', () => {
  test('clicking on existing Text enters edit mode without creating a second object', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'TextTool')

    // Create a text object
    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)
    await page.keyboard.type('hello')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    assert.equal((await getObjects(page)).length, 1, 'one text object created')

    // Click the same cell again — should edit the existing object, not create a new one
    await page.mouse.click(300, 300)
    await page.waitForTimeout(200)

    const drawing = await page.evaluate(() =>
      window.ascii_design.paper.eventHandler.drawing)
    assert.equal(drawing, true, 'should be in drawing mode when re-clicking existing text')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    assert.equal((await getObjects(page)).length, 1,
      'should still have exactly one text object after editing')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
