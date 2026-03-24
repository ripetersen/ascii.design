const ICON_PX = 48   // fixed CSS-pixel size — does not scale with zoom

const TOOL_ICONS = {
  SelectTool: 'cursor.svg',
  BoxTool:    'box.svg',
  LineTool:   'line.svg',
  PenTool:    'pen.svg',
  TextTool:   'text.svg',
}

// Hotspot as a fraction of the icon's width/height (0,0 = top-left, 1,1 = bottom-right).
// The hotspot is the point within the icon that aligns with the cell centre.
// Calculated from each SVG's viewBox (all 128×128):
//   cursor.svg  — arrow tip at ~(39.8, 15.2)  → (39.8/128, 15.2/128)
//   box.svg     — rect centre at (64, 64)      → (0.5, 0.5)
//   line.svg    — Z-path starts at (8, 8)      → (8/128, 8/128)
//   pen.svg     — stroke starts at (8, 29.6)   → (8/128, 29.6/128)
//   text.svg    — "T" left edge, mid-height    → (4.8/128, 0.5)
const TOOL_HOTSPOTS = {
  SelectTool: { x: 0.311, y: 0.119 },
  BoxTool:    { x: 0.5,   y: 0.5   },
  LineTool:   { x: 0.063, y: 0.063 },
  PenTool:    { x: 0.063, y: 0.231 },
  TextTool:   { x: 0.037, y: 0.5   },
}

async function loadIcon(file, strokeColor, fillColor) {
  try {
    const text = await (await fetch(file)).text()
    const colored = text
      .replace(/stroke:\s*(#000000|black)/gi, `stroke:${strokeColor}`)
      .replace(/stroke="(#000000|black)"/gi,  `stroke="${strokeColor}"`)
      .replace(/fill:\s*#000000/gi,            `fill:${fillColor}`)
      .replace(/fill="(#000000|black)"/gi,     `fill="${fillColor}"`)
    return new Promise(resolve => {
      const img = new Image()
      img.onload  = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = 'data:image/svg+xml,' + encodeURIComponent(colored)
    })
  } catch { return null }
}

export class Cursor extends EventTarget {
  constructor(paper) {
    super()
    this.paper = paper
    this.row = 0
    this.col = 0
    this._icons = {}            // toolName → { nav: Image|null, edit: Image|null }
    this._lastCursorType = 'icon'
    this._loadIcons()
  }

  async _loadIcons() {
    for (const [toolName, file] of Object.entries(TOOL_ICONS)) {
      const [nav, edit] = await Promise.all([
        loadIcon(file, 'black', 'black'),  // navigation: black icon, transparent bg
        loadIcon(file, 'white', 'white'),  // drawing:    white icon on black disc
      ])
      this._icons[toolName] = { nav, edit }
      if (this.paper.charSize) this.draw()
    }
  }

  // Kept for API compatibility (TextTool calls these on start/finish)
  setKeyboard() {}
  setMouse()    {}

  up()    { this.move({ row: this.row - 1, col: this.col }) }
  down()  { this.move({ row: this.row + 1, col: this.col }) }
  left()  { this.move({ row: this.row,     col: this.col - 1 }) }
  right() { this.move({ row: this.row,     col: this.col + 1 }) }

  move(e, force) {
    if (this.row !== e.row || this.col !== e.col || force) {
      this._erase(this.row, this.col)
      this.paper.highlight()
      this.row = e.row
      this.col = e.col
      this._draw()
      this.dispatchEvent(new CustomEvent('change', { detail: { row: this.row, col: this.col } }))
    }
  }

  draw() {
    this._draw()
  }

  // ── private ────────────────────────────────────────────────────────────────

  _cellCenter(row, col) {
    const cs = this.paper.charSize
    return {
      x: this.paper.col2x(col) + cs.width  / 2,
      y: this.paper.row2y(row) + cs.height / 2,
    }
  }

  // Erase the area previously occupied by the cursor.
  // Uses _lastCursorType so we repaint the right footprint.
  _erase(row, col) {
    if (!this.paper.charSize) return
    if (this._lastCursorType === 'text') {
      this.paper.redrawCell(row, col)
      return
    }
    // Icon cursor: repaint every cell the icon could overlap.
    // Use the full icon size (not half) because the hotspot may be near an edge,
    // meaning the icon extends almost a full sz in the opposite direction.
    const cs   = this.paper.charSize
    const dpr  = window.devicePixelRatio || 1
    const half = Math.ceil((ICON_PX * dpr) / Math.min(cs.width, cs.height)) + 1
    for (let dr = -half; dr <= half; dr++)
      for (let dc = -half; dc <= half; dc++)
        this.paper.redrawCell(row + dr, col + dc)
  }

  _draw() {
    if (!this.paper.charSize) return
    const tool     = this.paper.eventHandler
    const toolName = tool?.constructor.name ?? 'SelectTool'
    const drawing  = tool?.drawing ?? false

    if (toolName === 'TextTool' && drawing) {
      this._lastCursorType = 'text'
      this._drawTextCursor()
    } else {
      this._lastCursorType = 'icon'
      this._drawIconCursor(toolName, drawing)
    }
  }

  // Text-editor cursor: block (overwrite mode) or vertical bar (insert mode).
  _drawTextCursor() {
    const row  = this.row
    const col  = this.col
    const cs   = this.paper.charSize
    const ctx  = this.paper.ctx
    const x    = this.paper.col2x(col)
    const y    = this.paper.row2y(row)
    const tool = this.paper.eventHandler

    const insertMode = tool?.insertMode ?? false

    ctx.save()
    if (!insertMode) {
      // Overwrite cursor: solid black cell, character in white
      const char = this.paper.toolBuffer.has(row, col)
        ? this.paper.toolBuffer.get(row, col)
        : this.paper.paperBuffer.has(row, col)
          ? this.paper.paperBuffer.get(row, col)
          : null
      ctx.fillStyle = 'black'
      ctx.fillRect(x, y, cs.width, cs.height)
      if (char && char !== ' ') {
        ctx.font         = this.paper.fontHeight + 'px ' + this.paper.fontFamily
        ctx.textBaseline = 'top'
        ctx.fillStyle    = 'white'
        ctx.fillText(char, x, y + cs.leading)
      }
    } else {
      // Insert cursor: thin vertical bar on the left edge of the cell
      const barW = Math.max(3, Math.round(cs.width * 0.1))
      ctx.fillStyle = 'black'
      ctx.fillRect(x, y, barW, cs.height)
    }
    ctx.restore()
  }

  // Tool-icon cursor: dim outline (navigation) or solid disc + white icon (drawing).
  _drawIconCursor(toolName, drawing) {
    const icons = this._icons[toolName]
    if (!icons) return

    const dpr      = window.devicePixelRatio || 1
    const sz       = ICON_PX * dpr
    const { x: cx, y: cy } = this._cellCenter(this.row, this.col)
    const ctx = this.paper.ctx

    // Position the icon so its hotspot lands exactly on the cell centre.
    const hs = TOOL_HOTSPOTS[toolName] ?? { x: 0.5, y: 0.5 }
    const ix = cx - hs.x * sz
    const iy = cy - hs.y * sz

    ctx.save()
    if (drawing) {
      // Solid: black disc centred on the cell, white icon with hotspot at centre
      ctx.fillStyle = 'black'
      ctx.beginPath()
      ctx.arc(cx, cy, sz * 0.55, 0, Math.PI * 2)
      ctx.fill()
      if (icons.edit) ctx.drawImage(icons.edit, ix, iy, sz, sz)
    } else {
      // Navigation: semi-transparent icon, hotspot at cell centre
      ctx.globalAlpha = 0.4
      if (icons.nav) ctx.drawImage(icons.nav, ix, iy, sz, sz)
    }
    ctx.restore()
  }

  keydown(e) {
    e.row = this.row
    e.col = this.col
    switch (e.key) {
      case 'ArrowUp':    e.row -= 1; break
      case 'ArrowDown':  e.row += 1; break
      case 'ArrowRight': e.col += 1; break
      case 'ArrowLeft':  e.col -= 1; break
    }
    this.move(e)
  }
}
