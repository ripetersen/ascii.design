'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool, getObjects } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

describe('tool selection', () => {
  test('clicking each icon activates that tool', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    for (const tool of ['BoxTool', 'LineTool', 'PenTool', 'TextTool', 'SelectTool']) {
      await selectTool(page, tool)
      const active = await page.evaluate(
        () => window.ascii_design.toolbox.selectedTool.constructor.name)
      assert.equal(active, tool)
    }

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('box tool', () => {
  test('drag creates a Box with correct dimensions', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'BoxTool')

    await page.mouse.move(200, 100)
    await page.mouse.down()
    await page.mouse.move(500, 350)
    await page.mouse.up()
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    const box = objs.find(o => o.type === 'Box')
    assert.ok(box, 'a Box should be created')
    assert.ok(box.width > 1, 'width should be > 1')
    assert.ok(box.height > 1, 'height should be > 1')
    // bounding box top-left == row/col (Box normalises these in finish())
    assert.equal(box.top,  box.row)
    assert.equal(box.left, box.col)

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('pen tool', () => {
  test('drag creates a PenLine', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'PenTool')

    await page.mouse.move(200, 200)
    await page.mouse.down()
    await page.mouse.move(400, 250)
    await page.mouse.up()
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    assert.ok(objs.some(o => o.type === 'PenLine'), 'a PenLine should be created')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
