'use strict'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { setup, teardown, newPage, loadApp, selectTool } = require('./helpers')

let ctx

before(async () => { ctx = await setup() })
after(async  () => { await teardown(ctx) })

async function getLines(page) {
  return page.evaluate(() => {
    const obj = window.ascii_design.paper.allObjects()
      .find(o => o.constructor.name === 'Text')
    return obj ? obj.lines : null
  })
}

describe('text tool — Enter key', () => {
  test('Enter splits line at cursor: right portion moves to next row', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'TextTool')

    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)
    await page.keyboard.type('hello')
    // Move cursor back to the 'l' at index 2
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(50)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const lines = await getLines(page)
    assert.deepEqual(lines, ['he', 'llo'], `expected ['he','llo'], got ${JSON.stringify(lines)}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Enter at end of line creates empty next line', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'TextTool')

    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)
    await page.keyboard.type('hello')
    await page.keyboard.press('Enter')
    await page.keyboard.type('world')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const lines = await getLines(page)
    assert.deepEqual(lines, ['hello', 'world'],
      `expected ['hello','world'], got ${JSON.stringify(lines)}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('Enter in middle of first line does not corrupt second line', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'TextTool')

    // Type two lines
    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)
    await page.keyboard.type('hello')
    await page.keyboard.press('Enter')
    await page.keyboard.type('world')
    await page.waitForTimeout(50)

    // Go back to row 0, position 2 ('l')
    await page.keyboard.press('ArrowUp')   // up to row 0 (clamped to col 5 → end of 'hello')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft') // now at index 2, the first 'l'
    await page.waitForTimeout(50)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(50)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const lines = await getLines(page)
    assert.deepEqual(lines, ['he', 'llo', 'world'],
      `expected ['he','llo','world'], got ${JSON.stringify(lines)}`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })

  test('left arrow does not wrap past start of line', async () => {
    const page = await newPage(ctx.browser)
    await loadApp(page)
    await selectTool(page, 'TextTool')

    await page.mouse.click(300, 300)
    await page.waitForTimeout(100)
    await page.keyboard.type('ab')
    await page.keyboard.press('Enter')
    await page.keyboard.type('cd')
    // cursor is now at end of 'cd' on row 1
    // move all the way left — should stop at col text.col, not wrap to row 0
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
    // default is insert mode, so 'X' inserts before 'cd'
    await page.keyboard.type('X')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const lines = await getLines(page)
    assert.equal(lines[1], 'Xcd', `expected 'Xcd' on line 1, got '${lines[1]}'`)
    assert.equal(page.errors.length, 0, `JS errors: ${page.errors}`)
    await page.close()
  })
})
