'use strict'
const { chromium } = require('playwright')
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 8889
const BASE_URL = `http://localhost:${PORT}`
const SRC_DIR = path.join(__dirname, '../src')

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(SRC_DIR, req.url === '/' ? '/index.html' : req.url)
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return }
        const ext = path.extname(filePath)
        const mime = { '.html': 'text/html', '.js': 'application/javascript',
                       '.css': 'text/css', '.svg': 'image/svg+xml' }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain', 'Cache-Control': 'no-cache' })
        res.end(data)
      })
    })
    server.on('error', reject)
    server.listen(PORT, () => resolve(server))
  })
}

function stopServer(server) {
  return new Promise(resolve => server.close(resolve))
}

async function setup() {
  const server = await startServer()
  const browser = await chromium.launch({ headless: true })
  return { server, browser }
}

async function teardown({ server, browser }) {
  await browser.close()
  await stopServer(server)
}

async function newPage(browser) {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1200, height: 800 })
  const errors = []
  page.on('pageerror', err => errors.push(err.toString()))
  page.errors = errors
  return page
}

async function loadApp(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(1500)
  // Start each test with a clean slate
  await page.evaluate(() => localStorage.removeItem('ascii-design-state'))
}

async function selectTool(page, toolName) {
  await page.$eval(`[data-tool="${toolName}"]`, el => el.click())
  await page.waitForTimeout(100)
}

async function clearCanvas(page) {
  await page.evaluate(() => {
    const paper = window.ascii_design.paper
    paper.deleteObject(...paper.allObjects())
    localStorage.removeItem('ascii-design-state')
  })
}

// Returns plain serialisable objects from the paper
async function getObjects(page) {
  return page.evaluate(() =>
    window.ascii_design.paper.allObjects().map(o => ({
      type:   o.constructor.name,
      row:    o.row,
      col:    o.col,
      width:  o.width,
      height: o.height,
      top:    o.top,
      left:   o.left,
      bottom: o.bottom,
      right:  o.right,
      points: o.points ? o.points.map(p => ({ row: p.row, col: p.col })) : undefined,
    }))
  )
}

module.exports = { setup, teardown, newPage, loadApp, selectTool, clearCanvas, getObjects, BASE_URL }
