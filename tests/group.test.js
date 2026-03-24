'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool, getObjects } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

// Draw two separate boxes and return to SelectTool
async function drawTwoBoxes(page) {
  await selectTool(page, 'BoxTool')
  await page.mouse.move(100, 80);  await page.mouse.down()
  await page.mouse.move(250, 200); await page.mouse.up()
  await page.waitForTimeout(150)

  await page.mouse.move(350, 80);  await page.mouse.down()
  await page.mouse.move(500, 200); await page.mouse.up()
  await page.waitForTimeout(150)

  await selectTool(page, 'SelectTool')
}

describe('group — Ctrl+G / Ctrl+Shift+G', () => {
  test('Ctrl+G groups all selected objects into one Group', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await drawTwoBoxes(page)

    // Select all
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(50)

    const before = await getObjects(page)
    assert.equal(before.length, 2, 'should have 2 boxes before grouping')

    await page.keyboard.press('Control+g')
    await page.waitForTimeout(100)

    const after = await getObjects(page)
    assert.equal(after.length, 1, 'should have 1 group after Ctrl+G')
    assert.equal(after[0].type, 'Group', 'the single object should be a Group')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Group bounding box spans both children', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await drawTwoBoxes(page)

    await page.keyboard.press('Control+a')
    await page.waitForTimeout(50)

    // Record individual boxes' bounds before grouping
    const boxes = await getObjects(page)
    const expectedLeft   = Math.min(...boxes.map(b => b.left))
    const expectedTop    = Math.min(...boxes.map(b => b.top))
    const expectedRight  = Math.max(...boxes.map(b => b.right))
    const expectedBottom = Math.max(...boxes.map(b => b.bottom))

    await page.keyboard.press('Control+g')
    await page.waitForTimeout(100)

    const [group] = await getObjects(page)
    assert.equal(group.left,   expectedLeft,   'group.left should equal min child left')
    assert.equal(group.top,    expectedTop,    'group.top should equal min child top')
    assert.equal(group.right,  expectedRight,  'group.right should equal max child right')
    assert.equal(group.bottom, expectedBottom, 'group.bottom should equal max child bottom')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('moving a group moves all children together', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await drawTwoBoxes(page)

    await page.keyboard.press('Control+a')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(100)

    // Record group position before move
    const [before] = await getObjects(page)

    // Move group 3 rows down via ArrowDown (group should be selected after Ctrl+G)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(50)

    const [after] = await getObjects(page)
    assert.equal(after.top,  before.top  + 3, 'group top should move down by 3')
    assert.equal(after.left, before.left,      'group left should be unchanged')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Ctrl+Shift+G ungroups back to individual objects', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await drawTwoBoxes(page)

    await page.keyboard.press('Control+a')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(100)

    assert.equal((await getObjects(page)).length, 1, 'should have 1 group')

    await page.keyboard.press('Control+Shift+g')
    await page.waitForTimeout(100)

    const after = await getObjects(page)
    assert.equal(after.length, 2, 'should have 2 objects after ungroup')
    assert.ok(after.every(o => o.type === 'Box'), 'both objects should be Boxes')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Group survives save and reload', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await drawTwoBoxes(page)

    await page.keyboard.press('Control+a')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(200)

    const [before] = await getObjects(page)

    await page.reload()
    await page.waitForTimeout(1500)

    const after = await getObjects(page)
    assert.equal(after.length, 1, 'group should survive reload')
    assert.equal(after[0].type, 'Group', 'reloaded object should be a Group')
    assert.equal(after[0].left, before.left, 'group position should be preserved')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
