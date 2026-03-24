'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool, getObjects } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

// Return the canvas character size so we can compute pixel coords from grid coords.
async function charSize(page) {
  return page.evaluate(() => window.ascii_design.paper.charSize)
}

// Top-left pixel of a grid cell (no centering needed — just needs to land in the cell).
function cellPixel(cs, row, col) {
  // col2x = cs.width*col + 1,  row2y = cs.height*row + 1
  return { x: cs.width * col + 4, y: cs.height * row + 4 }
}

async function drawBox(page, x1, y1, x2, y2) {
  await selectTool(page, 'BoxTool')
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2)
  await page.mouse.up()
  await page.waitForTimeout(200)
}

describe('select tool — select all', () => {
  test('Ctrl+A selects all objects', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    // Draw two boxes
    await drawBox(page, 100, 100, 250, 220)
    await drawBox(page, 400, 100, 550, 220)

    await selectTool(page, 'SelectTool')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(100)

    const selected = await page.evaluate(() =>
      window.ascii_design.paper.selectedObjects().length
    )
    assert.equal(selected, 2, 'Ctrl+A should select all 2 objects')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('select tool — drag from bbox interior', () => {
  test('drag from inside bounding box of selected object moves it', async () => {
    // Regression: once selected, dragging from an empty interior cell should
    // move the object. Previously only dragging from an exact hit cell worked.
    const page = await newPage(ctx.browser)
    await loadApp(page)

    await drawBox(page, 100, 100, 400, 320)

    const cs  = await charSize(page)
    const [box] = await getObjects(page)

    // Select by clicking the top border
    await selectTool(page, 'SelectTool')
    const borderPx = cellPixel(cs, box.row, box.col + Math.floor(box.width / 2))
    await page.mouse.click(borderPx.x, borderPx.y)
    await page.waitForTimeout(100)

    // Drag from interior (empty cell) — 3 rows down
    const interiorRow = box.row + Math.floor(box.height / 2)
    const interiorCol = box.col + Math.floor(box.width  / 2)
    const from = cellPixel(cs, interiorRow, interiorCol)
    const to   = { x: from.x, y: from.y + 3 * cs.height }

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.waitForTimeout(50)
    await page.mouse.move(to.x, to.y)
    await page.waitForTimeout(50)
    await page.mouse.up()
    await page.waitForTimeout(200)

    const [moved] = await getObjects(page)
    assert.equal(moved.row, box.row + 3,
      `box should have moved 3 rows down; was ${box.row}, now ${moved.row}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('select tool — move persistence', () => {
  test('drag-moved object position survives page reload', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    // Draw a box well below the menu bar
    await drawBox(page, 200, 150, 480, 380)

    const cs   = await charSize(page)
    const [box] = await getObjects(page)
    assert.ok(box, 'box should exist')

    // Click on the top border (row=box.row, some col in the middle of the box)
    const midCol    = box.col + Math.floor(box.width / 2)
    const { x: sx, y: sy } = cellPixel(cs, box.row, midCol)

    // Drag 4 cols right and 3 rows down
    const ex = sx + 4 * cs.width
    const ey = sy + 3 * cs.height

    await selectTool(page, 'SelectTool')
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.waitForTimeout(50)
    await page.mouse.move(ex, ey)
    await page.waitForTimeout(50)
    await page.mouse.up()
    await page.waitForTimeout(300)

    const [moved] = await getObjects(page)
    assert.ok(moved, 'box should still exist after drag')
    assert.ok(
      moved.row !== box.row || moved.col !== box.col,
      `box should have moved from (${box.row},${box.col}) but is still at (${moved.row},${moved.col})`
    )

    await page.reload()
    await page.waitForTimeout(1500)

    const [afterReload] = await getObjects(page)
    assert.ok(afterReload, 'box should survive reload')
    assert.equal(afterReload.row, moved.row, 'row should be persisted')
    assert.equal(afterReload.col, moved.col, 'col should be persisted')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('arrow-key nudge position survives page reload', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    await drawBox(page, 200, 150, 480, 380)

    const cs    = await charSize(page)
    const [box] = await getObjects(page)

    // Click on the left border to select the box
    const midRow = box.row + Math.floor(box.height / 2)
    const { x, y } = cellPixel(cs, midRow, box.col)

    await selectTool(page, 'SelectTool')
    await page.mouse.click(x, y)
    await page.waitForTimeout(100)

    // Nudge down twice
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)

    const [nudged] = await getObjects(page)
    assert.equal(nudged.row, box.row + 2, 'row should increase by 2 after two ArrowDown presses')

    await page.reload()
    await page.waitForTimeout(1500)

    const [afterReload] = await getObjects(page)
    assert.equal(afterReload.row, nudged.row, 'nudged row should be persisted after reload')
    assert.equal(afterReload.col, nudged.col, 'col should be unchanged')

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('select tool — click deselects', () => {
  test('clicking empty interior of selected box deselects it', async () => {
    // Regression: cursorClick had an inSelectedBbox guard that prevented
    // deselection when clicking empty cells inside a selected object's bbox.
    const page = await newPage(ctx.browser)
    await loadApp(page)

    await drawBox(page, 100, 100, 400, 320)
    const cs  = await charSize(page)
    const [box] = await getObjects(page)

    await selectTool(page, 'SelectTool')

    // Select by clicking the top border
    const borderPx = cellPixel(cs, box.row, box.col + Math.floor(box.width / 2))
    await page.mouse.click(borderPx.x, borderPx.y)
    await page.waitForTimeout(100)

    // Click on an empty interior cell (inside bbox, but not a drawn cell)
    const interiorPx = cellPixel(cs,
      box.row + Math.floor(box.height / 2),
      box.col + Math.floor(box.width  / 2))
    await page.mouse.click(interiorPx.x, interiorPx.y)
    await page.waitForTimeout(100)

    const selected = await page.evaluate(() => window.ascii_design.paper.selectedObjects().length)
    assert.equal(selected, 0, 'clicking empty space inside bbox should deselect')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('select tool — space key selection', () => {
  test('Space selects object under cursor, deselecting others', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    await drawBox(page, 100, 100, 300, 250)
    const cs  = await charSize(page)
    const [box] = await getObjects(page)

    await selectTool(page, 'SelectTool')

    // Move cursor to the top border of the box (box is deselected at this point)
    const px = cellPixel(cs, box.row, box.col + 1)
    await page.mouse.move(px.x, px.y)
    await page.waitForTimeout(50)
    await page.keyboard.press('Space')
    await page.waitForTimeout(100)

    const selected = await page.evaluate(() => window.ascii_design.paper.selectedObjects().length)
    assert.equal(selected, 1, 'Space should select the object under the cursor')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Shift+Space adds object under cursor to selection', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    await drawBox(page, 100, 100, 250, 220)
    await drawBox(page, 400, 100, 550, 220)
    const cs   = await charSize(page)
    const objs = await getObjects(page)
    const [box1, box2] = objs

    await selectTool(page, 'SelectTool')

    // Select box1 with Space
    const px1 = cellPixel(cs, box1.row, box1.col + 1)
    await page.mouse.move(px1.x, px1.y)
    await page.waitForTimeout(50)
    await page.keyboard.press('Space')
    await page.waitForTimeout(50)

    // Add box2 with Shift+Space
    const px2 = cellPixel(cs, box2.row, box2.col + 1)
    await page.mouse.move(px2.x, px2.y)
    await page.waitForTimeout(50)
    await page.keyboard.press('Shift+Space')
    await page.waitForTimeout(100)

    const selected = await page.evaluate(() => window.ascii_design.paper.selectedObjects().length)
    assert.equal(selected, 2, 'Shift+Space should add the object to the existing selection')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Space on empty cell does not change selection', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)

    await drawBox(page, 100, 100, 250, 220)
    const cs  = await charSize(page)
    const [box] = await getObjects(page)

    await selectTool(page, 'SelectTool')

    // Select the box first by clicking its border
    const borderPx = cellPixel(cs, box.row, box.col + 1)
    await page.mouse.click(borderPx.x, borderPx.y)
    await page.waitForTimeout(50)

    // Move to empty space far from any object and press Space
    await page.mouse.move(700, 500)
    await page.waitForTimeout(50)
    await page.keyboard.press('Space')
    await page.waitForTimeout(100)

    const selected = await page.evaluate(() => window.ascii_design.paper.selectedObjects().length)
    assert.equal(selected, 1, 'Space on empty cell should not change selection')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
