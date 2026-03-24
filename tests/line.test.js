'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool, clearCanvas, getObjects, BASE_URL } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

async function startLine(page) {
  await selectTool(page, 'LineTool')
}

describe('line tool — basic drawing', () => {
  test('straight horizontal line via dblclick', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await startLine(page)

    await page.mouse.click(200, 200)
    await page.mouse.move(500, 200)
    await page.waitForTimeout(100)
    await page.mouse.dblclick(500, 200)
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    const line = objs.find(o => o.type === 'Line')
    assert.ok(line, 'a Line should be created')
    assert.ok(line.points.length >= 2, 'line should have ≥ 2 confirmed points')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('L-shaped line (elbow) via dblclick produces ≥ 3 points', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await startLine(page)

    await page.mouse.click(200, 200)
    await page.mouse.move(500, 400)
    await page.waitForTimeout(100)
    await page.mouse.dblclick(500, 400)
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    const line = objs.find(o => o.type === 'Line')
    assert.ok(line, 'a Line should be created')
    assert.ok(line.points.length >= 3, `elbow needs ≥ 3 points, got ${line.points.length}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('multi-segment line (click, move, click, move, dblclick)', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await startLine(page)

    await page.mouse.click(100, 200)
    await page.mouse.move(400, 200)
    await page.waitForTimeout(100)
    await page.mouse.click(400, 200)
    await page.mouse.move(400, 400)
    await page.waitForTimeout(100)
    await page.mouse.dblclick(400, 400)
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    const line = objs.find(o => o.type === 'Line')
    assert.ok(line, 'a Line should be created')
    assert.ok(line.points.length >= 4, `expected ≥ 4 points for two segments, got ${line.points.length}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('line tool — Esc behaviour', () => {
  test('Esc before any segment committed discards the line', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await startLine(page)

    await page.mouse.click(200, 200)
    await page.mouse.move(400, 300)
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const objs = await getObjects(page)
    assert.equal(objs.length, 0, 'Esc with no committed segments should discard the line')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Esc after one committed segment discards the entire line', async () => {
    // Spec: Esc abandons the entire DrawObject, including already-committed segments.
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await startLine(page)

    await page.mouse.click(100, 200)
    await page.mouse.move(400, 200)
    await page.waitForTimeout(100)
    await page.mouse.click(400, 200)       // commit segment
    await page.mouse.move(600, 300)        // start new pending segment
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')    // should discard entire line
    await page.waitForTimeout(200)

    const objs = await getObjects(page)
    assert.equal(objs.length, 0, 'Esc should discard the entire line, including committed segments')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('line tool — hit testing', () => {
  test('empty space inside bounding box does not select line', async () => {
    // Regression: Line.contains() used raw bounding-box, so any click inside
    // the bbox selected the line even on cells the line never passed through.
    const page = await newPage(ctx.browser)
    await loadApp(page)

    // L-shaped line: (5,5)→(5,15)→(15,15). Bounding box is rows 5-15, cols 5-15.
    // Cell (10,5) is inside the bbox but the line never visits it.
    const lineData = { type: 'Line', row: 5, col: 5, points: [
      { row: 0, col: 0 }, { row: 0, col: 10 }, { row: 10, col: 10 }
    ]}
    await page.evaluate((data) => {
      localStorage.setItem('ascii-design-state', JSON.stringify({ version: 1, objects: [data] }))
    }, lineData)
    await page.goto(BASE_URL)
    await page.waitForTimeout(1500)

    const result = await page.evaluate(() => {
      const paper = window.ascii_design.paper
      return {
        hitEmpty: paper.objectsAt(10, 5).length,  // inside bbox, no line here
        hitLine:  paper.objectsAt(5, 10).length,  // on the horizontal segment
      }
    })
    assert.equal(result.hitEmpty, 0, 'click on empty cell inside bbox should not select line')
    assert.equal(result.hitLine,  1, 'click on actual line segment should select line')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('line tool — keyboard drawing', () => {
  test('Enter starts drawing; second Enter commits and exits drawing mode', async () => {
    // Regression: Enter in drawing mode kept drawing=true instead of finishing.
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'LineTool')

    // Position cursor with mouse.move (does NOT start drawing)
    await page.mouse.move(300, 300)
    await page.waitForTimeout(50)

    // Enter starts drawing
    await page.keyboard.press('Enter')
    await page.waitForTimeout(50)

    // Move right 5 cells
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(50)

    // Enter should commit pending segment and exit drawing mode
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    const line = objs.find(o => o.type === 'Line')
    assert.ok(line, 'Enter+move+Enter should create a Line')
    assert.ok(line.points.length >= 2, `line should have ≥ 2 points, got ${line.points.length}`)

    // Drawing mode should be off — a complete second Enter/move/Enter creates a second line
    await page.keyboard.press('Enter')  // start second line
    await page.waitForTimeout(50)
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(50)
    await page.keyboard.press('Enter')  // finish second line
    await page.waitForTimeout(300)

    const objs2 = await getObjects(page)
    assert.equal(objs2.length, 2, 'second Enter+move+Enter cycle should produce a second Line')
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('direction change with arrow keys auto-commits segment', async () => {
    // Regression: arrow keys only updated the pending L-shape without ever
    // committing. Changing axis (H→V or V→H) should auto-commit the current
    // position so multi-segment lines can be drawn with the keyboard alone.
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'LineTool')

    // Click to start a line at current cursor position
    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)

    // Draw 5 cells to the right
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(50)

    // Change to vertical — should auto-commit the horizontal segment
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(50)

    // Draw 3 more cells down
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(50)

    // Ctrl+Enter finishes (line has >= 2 confirmed points from auto-commit)
    await page.keyboard.press('Control+Enter')
    await page.waitForTimeout(300)

    const linePoints = await page.evaluate(() => {
      const line = window.ascii_design.paper.allObjects().find(o => o.constructor.name === 'Line')
      return line ? line.points.length : 0
    })

    // Without auto-commit: only the anchor (1 point), line not saved at all.
    // With auto-commit: anchor + 2 from horizontal commit + pending end = >= 3.
    assert.ok(linePoints >= 3,
      `expected >= 3 confirmed points (auto-committed elbow), got ${linePoints}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('line tool — intersection composition', () => {
  test('line terminating on itself shows correct junction char (not phantom ┼)', async () => {
    // Regression: a line that loops back and terminates on its own first segment
    // was composing ┼ (4-way) instead of ┬ (3-way) because the incoming │ char
    // falsely contributed a phantom north connection at the terminus.
    const page = await newPage(ctx.browser)
    await loadApp(page)

    // Inject the exact line reported by the user
    const lineData = {"type":"Line","row":14,"col":19,"points":[
      {"row":0,"col":0},{"row":0,"col":-10},{"row":0,"col":-10},
      {"row":6,"col":-10},{"row":6,"col":-10},{"row":6,"col":-4},
      {"row":6,"col":-4},{"row":0,"col":-4},{"row":0,"col":-4}
    ]}
    await page.evaluate((data) => {
      localStorage.setItem('ascii-design-state', JSON.stringify({ version: 1, objects: [data] }))
    }, lineData)
    await page.goto(BASE_URL)
    await page.waitForTimeout(1500)

    // The vertical segment terminates at (14,15) on top of the horizontal segment.
    // The correct char is ┬ (connects south + east + west, NOT north).
    const char = await page.evaluate(() => window.ascii_design.paper.paperBuffer.get(14, 15))
    assert.equal(char, '┬', `terminus intersection at (14,15) should be ┬, got ${char}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})

describe('line tool — bounding box', () => {
  test('bounding box top-left is the geometric minimum, not the start anchor', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await startLine(page)

    // Draw a line that goes RIGHT then DOWN — cursor ends to the right and below start.
    // For this line the anchor IS the top-left, so we test the other direction:
    // Start bottom-right, go left then up so anchor is NOT the min row/col.
    // We draw via two segments: first left (same row), then up.
    await page.mouse.click(600, 500)      // start at a point that is NOT top-left
    await page.mouse.move(200, 500)       // move left (same row → horizontal segment)
    await page.waitForTimeout(100)
    await page.mouse.click(200, 500)      // commit horizontal segment
    await page.mouse.move(200, 200)       // move up (same col → vertical segment)
    await page.waitForTimeout(100)
    await page.mouse.dblclick(200, 200)   // commit vertical segment + finish
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    const line = objs.find(o => o.type === 'Line')
    assert.ok(line, 'a Line should be created')

    // The line goes from anchor (bottom-right) upward and left,
    // so the bounding-box top-left must be strictly less than the anchor.
    assert.ok(line.top  <= line.row, `top (${line.top}) should be ≤ anchor row (${line.row})`)
    assert.ok(line.left <= line.col, `left (${line.left}) should be ≤ anchor col (${line.col})`)

    // And the right/bottom edges must be consistent with width/height
    assert.equal(line.right,  line.left + line.width  - 1)
    assert.equal(line.bottom, line.top  + line.height - 1)

    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('bounding box right/bottom are consistent for a simple rightward line', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await startLine(page)

    await page.mouse.click(200, 200)
    await page.mouse.move(600, 200)
    await page.waitForTimeout(100)
    await page.mouse.dblclick(600, 200)
    await page.waitForTimeout(300)

    const objs = await getObjects(page)
    const line = objs.find(o => o.type === 'Line')
    assert.ok(line, 'a Line should be created')
    assert.equal(line.right,  line.left + line.width  - 1)
    assert.equal(line.bottom, line.top  + line.height - 1)
    // For a rightward line the anchor IS the leftmost point
    assert.equal(line.top,  line.row)
    assert.equal(line.left, line.col)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
