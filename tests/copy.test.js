'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

// Mock clipboard.writeText and return captured text
async function ctrlC(page) {
  await page.evaluate(() => {
    window._clipboardText = null
    navigator.clipboard.writeText = text => {
      window._clipboardText = text
      return Promise.resolve()
    }
  })
  await page.keyboard.press('Control+c')
  await page.waitForTimeout(100)
  return page.evaluate(() => window._clipboardText)
}

describe('copy to clipboard — Ctrl+C', () => {
  test('copies a single box to clipboard', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')
    await page.mouse.move(100, 80);  await page.mouse.down()
    await page.mouse.move(250, 200); await page.mouse.up()
    await page.waitForTimeout(150)

    await selectTool(page, 'SelectTool')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(50)

    const text = await ctrlC(page)
    assert.ok(text !== null, 'clipboard should have been written')
    assert.ok(text.length > 0, 'clipboard text should be non-empty')
    // A box drawn with BOX characters should contain corner/edge chars
    const hasBoxChars = /[┌┐└┘─│]/.test(text)
    assert.ok(hasBoxChars, `clipboard should contain box-drawing chars, got: ${JSON.stringify(text)}`)

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('copies only selected objects, not all', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')
    // Draw two boxes side by side
    await page.mouse.move(100, 80);  await page.mouse.down()
    await page.mouse.move(200, 160); await page.mouse.up()
    await page.waitForTimeout(150)
    await page.mouse.move(350, 80);  await page.mouse.down()
    await page.mouse.move(500, 200); await page.mouse.up()
    await page.waitForTimeout(150)

    await selectTool(page, 'SelectTool')
    // Select only the first object programmatically
    await page.evaluate(() => {
      const paper = window.ascii_design.paper
      paper.allObjects().forEach(o => o.deselect())
      paper.allObjects()[0].select()
      paper.redraw()
    })
    await page.waitForTimeout(50)

    const textSelected = await ctrlC(page)
    assert.ok(textSelected !== null, 'clipboard should have been written')

    // Select all and copy
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(50)
    const textAll = await ctrlC(page)

    // Text with only one box selected should be shorter/smaller than with all selected
    assert.ok(textSelected.length < textAll.length,
      'copying one box should produce less text than copying both')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('copies everything when nothing is selected', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')
    await page.mouse.move(100, 80);  await page.mouse.down()
    await page.mouse.move(250, 200); await page.mouse.up()
    await page.waitForTimeout(150)

    await selectTool(page, 'SelectTool')
    // Deselect by clicking empty area
    await page.mouse.click(600, 400)
    await page.waitForTimeout(50)

    const text = await ctrlC(page)
    assert.ok(text !== null, 'clipboard should have been written even with no selection')
    assert.ok(/[┌┐└┘─│]/.test(text), 'clipboard should contain box chars from the only object')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('no crash on empty canvas copy', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'SelectTool')

    // Should not throw — just a no-op
    await page.evaluate(() => {
      window._clipboardCalled = false
      navigator.clipboard.writeText = text => {
        window._clipboardCalled = true
        return Promise.resolve()
      }
    })
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)

    const called = await page.evaluate(() => window._clipboardCalled)
    assert.equal(called, false, 'writeText should not be called on empty canvas')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
