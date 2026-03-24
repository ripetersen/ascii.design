'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool, clearCanvas, getObjects, BASE_URL } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

describe('localStorage persistence', () => {
  test('drawing a box saves it to localStorage', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')

    await page.mouse.move(200, 100)
    await page.mouse.down()
    await page.mouse.move(500, 350)
    await page.mouse.up()
    await page.waitForTimeout(300)

    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('ascii-design-state')
      return raw ? JSON.parse(raw) : null
    })
    assert.ok(saved, 'state should be saved')
    assert.equal(saved.version, 1)
    assert.ok(saved.objects.some(o => o.type === 'Box'), 'Box should be in saved state')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('objects are restored after page reload', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    // Draw one of each serialisable type
    await selectTool(page, 'BoxTool')
    await page.mouse.move(100, 80)
    await page.mouse.down()
    await page.mouse.move(300, 250)
    await page.mouse.up()
    await page.waitForTimeout(200)

    await selectTool(page, 'LineTool')
    await page.mouse.click(100, 400)
    await page.mouse.move(400, 400)
    await page.waitForTimeout(100)
    await page.mouse.dblclick(400, 400)
    await page.waitForTimeout(200)

    await selectTool(page, 'PenTool')
    await page.mouse.move(500, 100)
    await page.mouse.down()
    await page.mouse.move(650, 200)
    await page.mouse.up()
    await page.waitForTimeout(200)

    await selectTool(page, 'TextTool')
    await page.mouse.click(700, 300)
    await page.waitForTimeout(100)
    await page.keyboard.type('hi')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const before = await getObjects(page)
    assert.ok(before.length >= 4, `expected ≥ 4 objects before reload, got ${before.length}`)

    await page.reload()
    await page.waitForTimeout(1500)

    const after = await getObjects(page)
    assert.equal(after.length, before.length,
      `after reload expected ${before.length} objects, got ${after.length}`)

    const types = after.map(o => o.type)
    assert.ok(types.includes('Box'),     'Box should be restored')
    assert.ok(types.includes('Line'),    'Line should be restored')
    assert.ok(types.includes('PenLine'), 'PenLine should be restored')
    assert.ok(types.includes('Text'),    'Text should be restored')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('reload does not wipe existing objects (save timing bug)', async () => {
    // Regression: Paper constructor used to call redraw() → save() which
    // overwrote localStorage with an empty list before loadFromStorage ran.
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')

    await page.mouse.move(200, 100)
    await page.mouse.down()
    await page.mouse.move(500, 350)
    await page.mouse.up()
    await page.waitForTimeout(300)

    // Three successive reloads should all restore the box
    for (let i = 0; i < 3; i++) {
      await page.reload()
      await page.waitForTimeout(1500)
      const objs = await getObjects(page)
      assert.ok(objs.some(o => o.type === 'Box'),
        `Box should survive reload #${i + 1}`)
    }

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('clear button removes all objects and clears localStorage', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')

    await page.mouse.move(200, 100)
    await page.mouse.down()
    await page.mouse.move(500, 350)
    await page.mouse.up()
    await page.waitForTimeout(300)

    page.on('dialog', dialog => dialog.accept())
    await page.$eval('[data-action="clear"]', el => el.click())
    await page.waitForTimeout(500)

    const afterClear = await page.evaluate(() => ({
      count: window.ascii_design.paper.allObjects().length,
      ls:    localStorage.getItem('ascii-design-state'),
    }))
    assert.equal(afterClear.count, 0, 'canvas should be empty after clear')
    // localStorage should be null or contain an empty objects list
    const ls = afterClear.ls ? JSON.parse(afterClear.ls) : null
    assert.ok(!ls || ls.objects.length === 0, 'localStorage should have no objects after clear')

    // Reload and verify nothing comes back
    await page.reload()
    await page.waitForTimeout(1500)
    const afterReload = await getObjects(page)
    assert.equal(afterReload.length, 0, 'objects should not return after reload post-clear')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
