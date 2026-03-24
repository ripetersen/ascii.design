import {Cursor} from './cursor.js'
import {Turtle} from './turtle.js'
import {Buffer, NullBuffer} from './buffer.js'

let debug = false;

export class Paper {
  constructor(canvas) {
    this.canvas = canvas
    this.padding = { x:0, y:0 }
    this._objects = []
    this._objectMap = new Map()
    this.fontFamily = "Monospace"
    this.fontHeight = 40
    this._zoomFactor = Math.sqrt(2)
    this._baseFont = 40
    this._panX = 0
    this._panY = 0
    this._panStart = null
    this._panConsumedDown = false
    this._rafId = null
    this._worldCanvas = document.createElement('canvas')
    this._worldDirty = true
    this._worldMargin = 0
    this._worldPanX = 0
    this._worldPanY = 0
    this.cursor = new Cursor(this)
    this.paperBuffer = new Buffer()
    this.toolBuffer = new Buffer()
    this.cursorBuffer = new NullBuffer()
    this.lastCursor = {row: -1, col: -1}
    this.buffer = this.toolBuffer
    this.turtle = new Turtle(this)

    this.ctx = canvas.getContext('2d')

    canvas.addEventListener('mousemove', (e) => this.mouseMove(e))
    canvas.addEventListener('mouseout', (e) => this.mouseOut(e))
    canvas.addEventListener('click', (e) => this.click(e))
    canvas.addEventListener('dblclick', (e) => this.dblclick(e))
    canvas.addEventListener('mousedown', (e) => this.mouseDown(e))
    canvas.addEventListener('mouseup', (e) => this.mouseUp(e))
    canvas.addEventListener('touchstart', (e) => this.touchStart(e))
    canvas.addEventListener('touchend', (e) => this.touchEnd(e))
    canvas.addEventListener('touchmove', (e) => this.touchMove(e))
    canvas.addEventListener('wheel', (e) => this.wheel(e), { passive: false })
    document.addEventListener("keydown", (e) => this.keydown(e))
    window.addEventListener('resize', (e) => this.resizeCanvas(e))

    this.resizeCanvas()
  }

  setEventHandler(eventHandler) {
    this.eventHandler = eventHandler
    this.toolBuffer.clear()
  }

  updateEvent(e) {
    e.preventDefault()
    let rect = this.canvas.getBoundingClientRect()
    let x = (e.clientX - rect.left)*window.devicePixelRatio
    let y = (e.clientY - rect.top )*window.devicePixelRatio
    e.col = this.x2col(x)
    e.row = this.y2row(y)
  }

  col2x(col) {
    return (this.charSize.width+2*this.padding.x)*col+this.padding.x+1+this._panX
  }

  x2col(x) {
    return Math.floor((x-1-this.padding.x-this._panX)/(this.charSize.width+2*this.padding.x))
  }

  row2y(row) {
    return (this.charSize.height+2*this.padding.y)*row+this.padding.y+1+this._panY
  }

  y2row(y) {
    return Math.floor((y-1-this.padding.y-this._panY)/(this.charSize.height+2*this.padding.y))
  }

  zoomIn()  { this._applyZoom(this.fontHeight * this._zoomFactor) }
  zoomOut() { this._applyZoom(this.fontHeight / this._zoomFactor) }
  resetZoom() {
    this._panX = 0
    this._panY = 0
    this.fontHeight = this._baseFont
    this.calculateCharacterSize()
    this._updateZoomDisplay()
    this._worldDirty = true
    this._scheduleFrame()
    this.save()
  }

  _applyZoom(size) {
    this._zoomAt(size, this.canvas.width / 2, this.canvas.height / 2)
  }

  _zoomAt(size, mx, my) {
    const newHeight = Math.round(Math.min(80, Math.max(12, size)))
    if (newHeight === this.fontHeight) return
    const cellW = this.charSize.width + 2 * this.padding.x
    const cellH = this.charSize.height + 2 * this.padding.y
    const fx = (mx - 1 - this.padding.x - this._panX) / cellW
    const fy = (my - 1 - this.padding.y - this._panY) / cellH
    this.fontHeight = newHeight
    this.calculateCharacterSize()
    const newCellW = this.charSize.width + 2 * this.padding.x
    const newCellH = this.charSize.height + 2 * this.padding.y
    this._panX = mx - 1 - this.padding.x - fx * newCellW
    this._panY = my - 1 - this.padding.y - fy * newCellH
    this._updateZoomDisplay()
    this._worldDirty = true
    this._scheduleFrame()
    this.save()
  }

  _updateZoomDisplay() {
    const el = document.getElementById('zoom')
    if (el) el.innerText = `${Math.round(this.fontHeight / this._baseFont * 100)}%`
  }

  // Schedule a _renderFrame on the next animation frame, coalescing multiple
  // updates (pan moves, zoom ticks) that arrive within the same frame.
  _scheduleFrame() {
    if (this._rafId) return
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null
      this._renderFrame()
    })
  }

  // Render all committed objects into the offscreen world canvas, centered on
  // the current viewport pan.  The canvas is (viewport + 2*margin) so a pan
  // of up to ±margin pixels from this position needs no re-render — just blit.
  _renderWorld() {
    const margin = Math.max(this.canvas.width, this.canvas.height)
    this._worldMargin = margin
    // Snapshot the viewport pan that this render is centered on.
    this._worldPanX = this._panX
    this._worldPanY = this._panY
    // Assigning width/height resets and clears the canvas.
    this._worldCanvas.width  = this.canvas.width  + 2 * margin
    this._worldCanvas.height = this.canvas.height + 2 * margin

    // Redirect rendering to the world canvas.  Use panX = margin + worldPanX
    // so the current viewport maps to the centre of the world canvas.
    const savedCtx  = this.ctx
    const savedPanX = this._panX
    const savedPanY = this._panY
    this.ctx   = this._worldCanvas.getContext('2d')
    this._panX = margin + this._worldPanX
    this._panY = margin + this._worldPanY

    this.drawObjects()

    this.ctx   = savedCtx
    this._panX = savedPanX
    this._panY = savedPanY
    this._worldDirty = false
  }

  // Fast composited frame used during pan and zoom:
  //   1. fill white background
  //   2. draw the periodic grid (cheap phase-shift calculation)
  //   3. blit the pre-rendered world canvas at the current pan offset
  //   4. draw selection highlights and cursor on top
  _renderFrame() {
    // Re-render world canvas if the viewport has drifted more than half the
    // available margin from the last render centre.  This keeps content at any
    // pan depth correctly in the world canvas without making it unboundedly large.
    if (Math.abs(this._panX - this._worldPanX) > this._worldMargin / 2 ||
        Math.abs(this._panY - this._worldPanY) > this._worldMargin / 2) {
      this._worldDirty = true
    }
    if (this._worldDirty) this._renderWorld()

    // canvas.width = canvas.width resets the bitmap and all canvas state.
    /* eslint-disable-next-line no-self-assign */
    this.canvas.width = this.canvas.width

    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.drawGrid()

    // Blit world canvas — a single GPU texture copy, no per-character work.
    // The offset accounts for both the margin padding and any drift from the
    // world-render centre.  Round to avoid sub-pixel interpolation blurring.
    this.ctx.drawImage(
      this._worldCanvas,
      Math.round(this._panX - this._worldPanX - this._worldMargin),
      Math.round(this._panY - this._worldPanY - this._worldMargin)
    )

    this.highlight()
    this.cursor.draw()
  }

  wheel(e) {
    if (e.ctrlKey) {
      e.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const dpi = window.devicePixelRatio
      const mx = (e.clientX - rect.left) * dpi
      const my = (e.clientY - rect.top) * dpi
      this._zoomAt(this.fontHeight * Math.pow(this._zoomFactor, -e.deltaY / 240), mx, my)
    }
  }

  keydown(e) {
    e.preventDefault()
    if (e.ctrlKey) {
      if (e.key === '=' || e.key === '+') { this.zoomIn();    return }
      if (e.key === '-' || e.key === '_') { this.zoomOut();   return }
      if (e.key === '0')                  { this.resetZoom(); return }
    }
    if( this.eventHandler && this.eventHandler.keydown ) {
      e.col = this.cursor.col
      e.row = this.cursor.row
      this.eventHandler.keydown(e)
    }
  }

  cursorMove(e) {
    if((e.row != this.lastCursor.row || e.col != this.lastCursor.col) &&
      this.eventHandler && this.eventHandler.cursorMove) {
      this.lastCursor.row = e.row
      this.lastCursor.col = e.col
      this.eventHandler.cursorMove(e)
    }
  }

  cursorDown(e) {
    if( this.eventHandler && this.eventHandler.cursorDown ) {
      this.eventHandler.cursorDown(e)
    }
  }

  cursorUp(e) {
    if( this.eventHandler && this.eventHandler.cursorUp ) {
      this.eventHandler.cursorUp(e)
    }
  }

  cursorClick(e) {
    if( this.eventHandler && this.eventHandler.cursorClick ) {
      this.eventHandler.cursorClick(e)
    }
  }

  cursorDoubleClick(e) {
    if( this.eventHandler && this.eventHandler.cursorDoubleClick ) {
      this.eventHandler.cursorDoubleClick(e)
    }
  }

  mouseOut() {
    // this.cursor.move(-1, -1)
  }

  mouseMove(e) {
    if (this._panStart) {
      e.preventDefault()
      const dpi = window.devicePixelRatio
      this._panX = this._panStart.panX + (e.clientX - this._panStart.clientX) * dpi
      this._panY = this._panStart.panY + (e.clientY - this._panStart.clientY) * dpi
      this._scheduleFrame()
      return
    }
    this.updateEvent(e)
    this.cursorMove(e)
  }

  touchMove(e) {
    this.updateEvent(e)
    this.cursorMove(e)
  }

  mouseDown(e) {
    if (e.ctrlKey || e.button === 1) {
      e.preventDefault()
      this._panStart = { clientX: e.clientX, clientY: e.clientY, panX: this._panX, panY: this._panY }
      this._panConsumedDown = true
      return
    }
    this._panConsumedDown = false
    this.updateEvent(e)
    this.cursorDown(e)
  }

  mouseUp(e) {
    if (this._panStart) {
      e.preventDefault()
      this._panStart = null
      this.save()
      return
    }
    this.updateEvent(e)
    this.cursorUp(e)
  }

  click(e) {
    if (this._panConsumedDown) return
    this.updateEvent(e)
    this.cursorClick(e)
  }

  dblclick(e) {
    if (this._panConsumedDown) return
    this.updateEvent(e)
    this.cursorDoubleClick(e)
  }

  touchStart(e) {
    this.updateEvent(e)
    this.cursorDown(e)
  }

  touchEnd(e) {
    this.updateEvent(e)
    this.cursorUp(e)
  }

  calculateCharacterSize() {
    let bufferCanvas = this.canvas
    if( !debug ) {
      bufferCanvas = document.createElement("canvas")
      bufferCanvas.width = 3*this.fontHeight
      bufferCanvas.height = 3*this.fontHeight
    }
    const bufferContext = bufferCanvas.getContext('2d')

    bufferContext.font = this.fontHeight+'px '+this.fontFamily
    console.log(`font = ${bufferContext.font}`)
    bufferContext.fillStyle = 'red'
    bufferContext.textBaseline = 'top'

    const width = Math.ceil(bufferContext.measureText('\u2588').width)
    console.log(`width = ${width}`)
    console.log(`top = ${this.fontHeight}`)
    bufferContext.fillText('\u2588', 0, this.fontHeight)

    let imageData = bufferContext.getImageData(Math.floor(width/2), 0, 1, this.fontHeight*3)
    let boundingTop = -1
    let boundingBottom = -1

    for(let n=0; n<this.fontHeight*3*4; n+=4) {
      if(imageData.data[n]!=0) {
        boundingTop = n/4
        console.log(`n = ${n}`)
        break
      }
    }

    for(let n=4*(boundingTop+1); n<this.fontHeight*3*4; n+=4) {
      if(imageData.data[n]==0) {
        boundingBottom = n/4
        break
      }
    }
    const height = boundingBottom - boundingTop

    this.charSize = {
      height: height,
      width: width,
      leading: this.fontHeight - boundingTop
    }
    console.log(this.charSize)
  }

  drawGrid() {
    const cellW = 2*this.padding.x + this.charSize.width
    const cellH = 2*this.padding.y + this.charSize.height
    const x0 = 1 + ((this._panX % cellW) + cellW) % cellW
    const y0 = 1 + ((this._panY % cellH) + cellH) % cellH
    this.ctx.beginPath()
    for(let x=x0; x<this.canvas.width;  x += cellW) {
      this.ctx.moveTo(x,1)
      this.ctx.lineTo(x,this.canvas.height)
    }
    for(let y=y0; y<this.canvas.height; y += cellH) {
      this.ctx.moveTo(1,y)
      this.ctx.lineTo(this.canvas.width, y)
    }
    this.ctx.strokeStyle = '#ccffff'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
  }

  clearCell(row, col) {
    const x = this.col2x(col)
    const y = this.row2y(row)
    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(x, y, this.charSize.width, this.charSize.height)
    this.ctx.strokeStyle = '#ccffff'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, this.charSize.width, this.charSize.height)
  }

  redrawCell(row, col) {
    const buffer = this.buffer
    this.buffer = this.cursorBuffer
    if( this.toolBuffer.has(row,col) ) {
      this.drawChar(this.toolBuffer.get(row, col), row, col)
    } else if( this.paperBuffer.has(row, col) ) {
      this.drawChar(this.paperBuffer.get(row, col), row, col)
    } else {
      this.clearCell(row, col)
    }
    this.buffer = buffer
  }

  drawCursor(c, row, col, style, backgroundStyle) {
    const buffer = this.buffer
    this.buffer = this.cursorBuffer
    this.drawChar(c, row, col, style, backgroundStyle)
    this.buffer = buffer
  }

  drawChar(c, row, col, style, backgroundStyle) {
    this.buffer.put(c, row, col)
    const x = this.col2x(col)
    const y = this.row2y(row)
    this.ctx.fillStyle = backgroundStyle || 'white'
    this.ctx.fillRect(x, y, this.charSize.width, this.charSize.height)
    this.ctx.font = this.fontHeight+'px '+this.fontFamily
    this.ctx.textBaseline = 'top'
    this.ctx.fillStyle = style || 'black'
    this.ctx.fillText(c, x, y + this.charSize.leading)
  }

  addObject(...objects) {
    objects.map(o => {
      if(!this._objectMap.has(o)) {
        this._objectMap.set(o,this._objects.push(o))
      }
    })
    this.save()
  }

  deleteObject(...objects) {
    const toDelete = new Set(objects)
    this._objects = this._objects.filter(o => !toDelete.has(o))
    toDelete.forEach(o => this._objectMap.delete(o))
    this.save()
  }

  objectsAt(row, col) {
    return this._objects.filter(o => o.contains(row, col))
  }

  allObjects() {
    return this._objects
  }

  selectedObjects() {
    return this._objects.filter(o => o.selected)
  }

  drawObjects() {
    this.buffer = this.paperBuffer
    this.buffer.clear()
    // Set font once for the whole pass; drawChar re-uses the already-set value.
    this.ctx.font = this.fontHeight + 'px ' + this.fontFamily
    this.ctx.textBaseline = 'top'
    this._objects.forEach(o => o.draw(this.turtle))
    this.buffer = this.toolBuffer
  }

  highlight() {
    const cellW = this.charSize.width + 2 * this.padding.x
    const cellH = this.charSize.height + 2 * this.padding.y
    this.selectedObjects().forEach(o => {
      this.ctx.strokeStyle = '#fcba03'
      this.ctx.lineWidth = 4
      this.ctx.strokeRect(
        this.col2x(o.left),
        this.row2y(o.top),
        Math.abs(o.width) * cellW,
        Math.abs(o.height) * cellH
      )
    })
  }

  resizeCanvas() {
    const dpi = window.devicePixelRatio
    const height = window.innerHeight
    this.canvas.style.height = height+'px'
    this.canvas.height=height*dpi
    const width = window.innerWidth
    this.canvas.style.width = width+'px'
    this.canvas.width=width*dpi
    this.calculateCharacterSize()
    this.redraw()
  }

  save() {
    const state = {
      version: 1,
      objects: this._objects.map(o => o.toJSON()).filter(Boolean),
      fontHeight: this.fontHeight,
      panX: this._panX,
      panY: this._panY,
    }
    localStorage.setItem('ascii-design-state', JSON.stringify(state))
  }

  redraw() {
    this._worldDirty = true
    /* eslint-disable-next-line no-self-assign */
    this.canvas.width = this.canvas.width
    this._objects = this._objects.filter(o => !o.empty)
    this._objectMap = new Map()
    this._objects.forEach((o,n) => this._objectMap.set(o,n))
    this._objectSet = new Set(this._objects)
    this.drawGrid()
    this.drawObjects()
    this.highlight()
    this.cursor.draw()
  }
}

