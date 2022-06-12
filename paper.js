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
    return (this.charSize.width+2*this.padding.x)*col+this.padding.x+1
  }

  x2col(x) {
    return Math.floor((x-1-this.padding.x)/(this.charSize.width+2*this.padding.x))
  }

  row2y(row) {
    return (this.charSize.height+2*this.padding.y)*row+this.padding.y+1
  }

  y2row(y) {
    return Math.floor((y-1-this.padding.y)/(this.charSize.height+2*this.padding.y))
  }

  keydown(e) {
    e.preventDefault()
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
    this.updateEvent(e)
    this.cursorMove(e)
  }

  touchMove(e) {
    this.updateEvent(e)
    this.cursorMove(e)
  }

  mouseDown(e) {
    this.updateEvent(e)
    this.cursorDown(e)
  }

  mouseUp(e) {
    this.updateEvent(e)
    this.cursorUp(e)
  }

  click(e) {
    this.updateEvent(e)
    this.cursorClick(e)
  }

  dblclick(e) {
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
    this.ctx.beginPath()
    for(let x=1; x<this.canvas.width;  x += (2*this.padding.x + this.charSize.width)) {
      this.ctx.moveTo(x,1)
      this.ctx.lineTo(x,this.canvas.height)
    }
    for(let y=1; y<this.canvas.height; y += (2*this.padding.y + this.charSize.height)) {
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
      this.clearCell(this.clearCell(row, col))
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
  }

  deleteObject(...objects) {
    objects.map(o => {
      if(this._objectMap.has(o)) {
        this._objects.splice(this._objectMap.get(o),1)
        this._objectMap.delete(o)
      }
    })
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
    this._objects.forEach(o => o.draw(this.turtle))
    this.buffer = this.toolBuffer
  }

  highlight() {
    this.selectedObjects().forEach(o => {
      this.ctx.strokeStyle = '#0000ff'
      this.ctx.lineWidth = 4
      this.ctx.strokeRect(this.col2x(o.left), this.row2y(o.top), this.col2x(Math.abs(o.width)), this.row2y(Math.abs(o.height)))
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

  redraw() {
    /* eslint-disable-next-line no-self-assign */
    this.canvas.width = this.canvas.width
    this._objects = this._objects.filter(o => !o.empty)
    this._objectMap = new Map()
    this._objects.forEach((o,n) => this._objectMap.set(o,n))
    this._objectSet = new Set(this._objects)
    this.drawGrid()
    this.drawObjects()
    this.highlight()
  }
}

