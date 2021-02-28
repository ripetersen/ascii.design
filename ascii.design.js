"use strict"

let debug = false;

const NORTH = 0b1100
const SOUTH = 0b0100
const EAST  = 0b0001
const WEST  = 0b0011

const VERT  = 0b0100 // eslint-disable-line no-unused-vars
const HORZ  = 0b0001 // eslint-disable-line no-unused-vars

const LEFT  = 0 // eslint-disable-line no-unused-vars
const RIGHT = 1
const TURNS = new Map()
TURNS.set(NORTH, [WEST, EAST])
TURNS.set(SOUTH, [EAST, WEST])
TURNS.set(EAST , [NORTH, SOUTH])
TURNS.set(WEST , [SOUTH, NORTH])

const ARROW_DIRECTION = new Map()
ARROW_DIRECTION.set('ArrowUp', NORTH)
ARROW_DIRECTION.set('ArrowDown', SOUTH)
ARROW_DIRECTION.set('ArrowLeft', WEST)
ARROW_DIRECTION.set('ArrowRight', EAST)

const CURSOR = new Map()
CURSOR.set(NORTH, '▴')
CURSOR.set(EAST , '▸')
CURSOR.set(SOUTH, '▾')
CURSOR.set(WEST , '◂')

const ERASE_CURSOR = new Map() // eslint-disable-line no-unused-vars
CURSOR.set(NORTH, '▴')
CURSOR.set(EAST , '▸')
CURSOR.set(SOUTH, '▾')
CURSOR.set(WEST , '◂')
//CURSOR.set(NORTH, '▲')
//CURSOR.set(EAST , '▶')
//CURSOR.set(SOUTH, '▼')
//CURSOR.set(WEST , '◀')

const BOX = new Map()
// Line
BOX.set(NORTH,          "│")
BOX.set(SOUTH,          "│")
BOX.set(EAST,           "─")
BOX.set(WEST,           "─")
// reverse
BOX.set(NORTH<<4 |  SOUTH,    "│")
BOX.set(WEST <<4 |  EAST,     "─")
BOX.set(SOUTH<<4 |  NORTH,    "│")
BOX.set(WEST <<4 |  EAST,     "─")

BOX.set(NORTH<<4 |  EAST,     "┌")
BOX.set(NORTH<<4 |  WEST,     "┐")

BOX.set(SOUTH<<4 |  EAST,     "└")
BOX.set(SOUTH<<4 |  WEST,     "┘")

BOX.set(WEST<<4  |  SOUTH,    "┌")
BOX.set(WEST<<4  |  NORTH,    "└")

BOX.set(EAST<<4  |  SOUTH,    "┐")
BOX.set(EAST<<4  |  NORTH,    "┘")

const ASCII = new Map()
ASCII.set(NORTH,        "|")
ASCII.set(SOUTH,        "|")
ASCII.set(EAST,         "-")
ASCII.set(WEST,         "-")
ASCII.set(NORTH<<4 |  EAST,   "+")
ASCII.set(WEST<<4  |  SOUTH,  "+")
ASCII.set(SOUTH<<4 |  EAST,   "+")
ASCII.set(WEST<<4  |  NORTH,  "+")
ASCII.set(EAST<<4  |  SOUTH,  "+")
ASCII.set(NORTH<<4 |  WEST,   "+")
ASCII.set(EAST<<4  |  NORTH,  "+")
ASCII.set(SOUTH<<4 |  WEST,   "+")

const ASCII_ROUND = new Map()
ASCII_ROUND.set(NORTH,        "|")
ASCII_ROUND.set(SOUTH,        "|")
ASCII_ROUND.set(EAST,         "-")
ASCII_ROUND.set(WEST,         "-")
ASCII_ROUND.set(NORTH<<4 |  EAST,   "/")
ASCII_ROUND.set(WEST<<4  |  SOUTH,  "/")
ASCII_ROUND.set(SOUTH<<4 |  EAST,   "\\")
ASCII_ROUND.set(WEST<<4  |  NORTH,  "\\")
ASCII_ROUND.set(EAST<<4  |  SOUTH,  "\\")
ASCII_ROUND.set(NORTH<<4 |  WEST,   "\\")
ASCII_ROUND.set(EAST<<4  |  NORTH,  "/")
ASCII_ROUND.set(SOUTH<<4 |  WEST,   "/")

const BLOCK = new Map()
BLOCK.set(NORTH,        "█")
BLOCK.set(SOUTH,        "█")
BLOCK.set(EAST,         "█")
BLOCK.set(WEST,         "█")
BLOCK.set(NORTH<<4 |  EAST,   "█")
BLOCK.set(WEST<<4  |  SOUTH,  "█")
BLOCK.set(SOUTH<<4 |  EAST,   "█")
BLOCK.set(WEST<<4  |  NORTH,  "█")
BLOCK.set(EAST<<4  |  SOUTH,  "█")
BLOCK.set(NORTH<<4 |  WEST,   "█")
BLOCK.set(EAST<<4  |  NORTH,  "█")
BLOCK.set(SOUTH<<4 |  WEST,   "█")

class Buffer {
  constructor(backgroundChar = ' ') {
    this.backgroundChar = backgroundChar
    this.rows = new Map()
    this.minRow = Number.MAX_SAFE_INTEGER
    this.maxRow = Number.MIN_SAFE_INTEGER
    this.minCol = Number.MAX_SAFE_INTEGER
    this.maxCol = Number.MIN_SAFE_INTEGER
    this.width = 0
    this.height = 0
  }

  clear() {
    this.rows.clear()
    this.minRow = Number.MAX_SAFE_INTEGER
    this.maxRow = Number.MIN_SAFE_INTEGER
    this.minCol = Number.MAX_SAFE_INTEGER
    this.maxCol = Number.MIN_SAFE_INTEGER
    this.width = 0
    this.height = 0
  }

  put(o, row, col) {
    if( !this.rows.has(row) ) {
      this.rows.set(row, new Map())
    }
    this.rows.get(row).set(col, o)
    this.minRow = Math.min(this.minRow, row)
    this.maxRow = Math.max(this.maxRow, row)
    this.minCol = Math.min(this.minCol, col)
    this.maxCol = Math.max(this.maxCol, col)
    this.height = this.maxRow - this.minRow + 1
    this.width = this.maxCol - this.minCol + 1
  }

  delete(row, col) {
    if( this.rows.has(row) ) {
      if( this.rows.get(row).has(col) ) {
        this.rows.get(row).delete(col)
        if( this.rows.get(row).size == 0 ) {
          this.rows.delete(row)
        }
      }
    }
  }

  get(row, col) {
    return this.rows.has(row) && this.rows.get(row).has(col) ?
      this.rows.get(row).get(col) : this.backgroundChar
  }

  has(row, col) {
    return this.rows.has(row) && this.rows.get(row).has(col)
  }

  toString() {
    let s = ''
    for( let r = this.minRow; r <= this.maxRow; r++) {
      for( let c = this.minCol; c <= this.maxCol; c++) {
        s = s + this.get(r, c)
      }
      s = s + '\n'
    }
    // for( let r = 0; r < this.height; r++ ) {
      // for( let c = 0; c < this.width; c++ ) {
        // s = s + this.get(r, c)
      // }
      // s = s + '\n'
    // }
    return s
  }
}

class NullBuffer {
  clear() {}
  put() {}
  get() {return null}
  has() {return false}
  toString() {return ''}
}

class Turtle {
  constructor(paper) {
    this.paper = paper
    this.row = 0
    this.col = 0
    this.direction = EAST
    this.characterSet = BOX
  }

  putchar(c) {
    if( c ) this.paper.drawChar(c, this.row, this.col, this.style, this.backgroundStyle)
    return this
  }

  write(s) {
    for( let c of s ) {
      this.putchar(c)
      this.step()
    }
    return this
  }

  step(steps=1) {
    let d = this.direction >> 2
    let vertical_step = (0b1 & d) * ((0b10 & d)*-1 + 1)

    d = this.direction & 0b11
    let horizontal_step = (0b1 & d) * ((0b10 & d)*-1 + 1)

    return this.goto(this.row + steps * vertical_step, this.col + steps * horizontal_step)
  }

  goto(row, col) {
    this.row = row
    this.col = col
    return this
  }

  face(direction) {
    this.putchar(this.characterSet.get(this.direction<<4 | direction))
    this.direction = direction
    this.step()
    return this
  }

  draw(length=1) {
    const reverse = length < 0
    if( reverse ) {
      length = -length
      this.direction = (this.direction | (this.direction & 0b0101)<<1) & (this.direction ^ 0b1010)
    }
    this.write(this.characterSet.get(this.direction).repeat(length))
    if( reverse ) {
      this.direction = (this.direction | (this.direction & 0b0101)<<1) & (this.direction ^ 0b1010)
    }
    return this
  }

  turn(direction) {
    return this.face(TURNS.get(this.direction)[direction])
  }

  go(direction) {
    return this.direction == direction ? this.draw() : this.face(direction)
  }
}

/* eslint-disable-next-line no-unused-vars */
// class LineArtist {
  // straightLine(row,col) {
    // const tail = this.line.start.tail().previous;
    // const deltaR = Math.abs(tail.row - row);
    // const deltaC = Math.abs(tail.col - col);
    // if (deltaR > deltaC) {
      // col = tail.col;
    // } else {
      // row = tail.row;
    // }
    // return [row,col];
  // }
//
  // cursorClick(row, col) {
    // if( this.line ) {
      // [row,col] = this.straightLine(row,col);
      // console.log(`new Point(${row},${col}`);
      // this.line.start.tail().add(new Point(row,col));
    // } else {
      // console.log('start Line')
      // this.line = new Line((new Point(row,col)).add(new Point(row,col)).head(),lineStyle.ascii);
    // }
    // this.line.draw();
  // }
//
  // cursorMove(row, col) {
    // if( this.line ) {
      // const tail = this.line.start.tail();
      // [row,col] = this.straightLine(row,col);
      // tail.row = row;
      // tail.col = col;
      // redraw();
      // this.line.draw();
    // }
  // }
// }
//
// class BoxArtist {
  // cursorDown(row, col) {
    // this.box = new Box(row,col,1,1,boxStyle.ascii);
    // this.box.draw();
  // }
//
  // cursorMove(row, col) {
    // if( this.box ) {
      // this.box.height = 1 + row - this.box.row;
      // this.box.width  = 1 + col - this.box.col;
      // redraw();
      // this.box.draw();
    // }
  // }
//
  // cursorUp(row,col) {
    // if( this.box ) {
      // this.box.height = 1 + row - this.box.row;
      // this.box.width  = 1 + col - this.box.col;
      // redraw();
      // this.box.draw();
      // objects.push(this.box);
    // }
    // this.box = null;
  // }
// }

/* eslint-disable-next-line no-unused-vars */

class DrawObject {
  constructor(row, col, width, height) {
    this.row = row
    this.col = col
    this.width = width == undefined ? 0 : width
    this.height = height == undefined ? 0 : height
    this.selected = false
  }

  select() { this.selected = true}
  deselect() { this.selected = false}
  isSelected() { return this.selected }

  left() { return this.col }
  right() { return this.col+this.width }
  top() { return this.row }
  bottom() { return this.row+this.height }

  contains(p) {
    return p.row >= this.top()  && p.row < this.bottom()  &&
           p.col >= this.left() && p.col < this.right()
  }
}

class AbstractTool {
  constructor(paper) {
    this.paper = paper
    this.drawing = false;
  }

  /* Arrow keys move the cursor and space and enter simulate a click */
  keydown(e){
    let cursorPosition = {row:this.paper.cursor.row, col:this.paper.cursor.col}
    switch( e.key ) {
      case 'ArrowUp':
        this.cursorMove({row: cursorPosition.row - 1, col: cursorPosition.col})
        break;
      case 'ArrowDown':
        this.cursorMove({row: cursorPosition.row + 1, col: cursorPosition.col})
        break;
      case 'ArrowRight':
        this.cursorMove({row: cursorPosition.row, col: cursorPosition.col + 1})
        break;
      case 'ArrowLeft':
        this.cursorMove({row: cursorPosition.row, col: cursorPosition.col - 1})
        break;
      case 'Escape':
        this.cancel()
        break;
      case ' ':
      case 'Enter':
        e.row = cursorPosition.row
        e.col = cursorPosition.col
        if( !this.drawing ) {
          this.cursorDown(e)
        } else {
          this.cursorUp(e)
        }
        this.cursorClick(e)
        break;
      default:
        if( e.altKey && e.key.length == 1) {
          this.paper.toolbox.selectTool(e.key)
        }
    }
  }

  // Just forward the move on to the paper's cursor
  cursorMove(e) {
    this.paper.cursor.move(e)
  }

  cursorDown() {}
  cursorUp() {}
  cursorClick() {}
  cancel() {}
  finish() {}
}

/* eslint-disable-next-line no-unused-vars */
class SelectTool extends AbstractTool {
  constructor(paper) {
    super(paper)
  }

  keydown(e){
    switch( e.key ) {
      case 'Backspace':
      case 'Delete':
        if( this.paper.objects.filter(o => o.isSelected()).length > 0 ) {
          for( let i=paper.objects.length - 1; i>=0; i--) {
            if( paper.objects[i].isSelected() ) {
              paper.objects.splice(i,1)
            }
          }
        }
        this.paper.redraw()
        this.paper.cursor.draw()
    }
    super.keydown(e)
  }

  cursorDown(e) {
    console.log(`Select at [${e.row},${e.col}]`)
    let selected = null
    for( let i=paper.objects.length - 1; i>=0; i--) {
      // TODO : select multiple objects
      //         or only top (first) object
      if(paper.objects[i].contains(e) && (!selected || e.shiftKey)) {
        selected = paper.objects[i]
        paper.objects[i].select()
      } else {
        if( !e.shiftKey ) {
          paper.objects[i].deselect()
        }
      }
    }
    this.paper.redraw()
    this.paper.cursor.draw()
  }

  finish() {
    paper.objects.forEach(o => o.deselect())
    this.paper.redraw()
    this.paper.cursor.draw()
  }
}

/* eslint-disable-next-line no-unused-vars */
class PenTool extends AbstractTool {}
/* eslint-disable-next-line no-unused-vars */
class LineTool extends AbstractTool {}
/* eslint-disable-next-line no-unused-vars */
class Line extends DrawObject {
  constructor(row0, col0, row1, col1) {
    super(row0, col0)
    row1 = row1 == undefined ? row0 : row1
    col1 = col1 == undefined ? col0 : col1
    this.row0 = row0
    this.col0 = col0
    this.row1 = row1
    this.col1 = col1
  }

  end(row, col) {
    this.row1 = row
    this.col1 = col
  }

  draw(turtle) {
    const upperRow = Math.min(this.row0, this.row1)
    const leftCol = Math.min(this.col0, this.col1)
    const height = Math.max(0, Math.abs(this.row1 - this.row0)-1)
    const width = Math.max(0, Math.abs(this.col1 - this.col0)-1)

    turtle.direction = EAST
    turtle.goto(upperRow, leftCol + 1)
      .draw(width).turn(RIGHT)
      .draw(height).turn(RIGHT)
      .draw(width).turn(RIGHT)
      .draw(height).turn(RIGHT)
  }
}

/* eslint-disable-next-line no-unused-vars */
class TextTool extends AbstractTool{
  constructor(paper) {
    super(paper)
    this.composing = false;
    // Position in the string
    this.charPos = 0;
    // Position of the cursor on the paper
  }

  cursorClick(e) {
    if( this.text ) {
      this.finish()
    }
    this.text = new Text(e.row, e.col)
    this.charPos = 0;
    this.paper.cursor.setKeyboard()
    this.paper.cursor.move(e)
    this.drawing = true
  }

  keydown(e){
    if( !this.drawing ) {
      super.keydown(e)
    } else {
      console.log( e.key )
      switch( e.key ) {
        case 'ArrowUp':
          this.paper.cursor.move({row: this.paper.cursor.row - 1, col: this.paper.cursor.col})
          break;
        case 'ArrowDown':
          this.paper.cursor.move({row: this.paper.cursor.row + 1, col: this.paper.cursor.col})
          break;
        case 'ArrowRight':
          this.paper.cursor.move({row: this.paper.cursor.row, col: this.paper.cursor.col + 1})
          break;
        case 'ArrowLeft':
          this.paper.cursor.move({row: this.paper.cursor.row, col: this.paper.cursor.col - 1})
          break;
        case 'Delete':
          this.text.delete(this.paper.cursor.row, this.paper.cursor.col)
          break;
        case 'Backspace':
          this.paper.cursor.move({row: this.paper.cursor.row, col: this.paper.cursor.col - 1})
          this.text.delete(this.paper.cursor.row, this.paper.cursor.col)
          break;
        case 'Escape':
          this.cancel()
          return
        case 'Enter':
          if( e.ctrlKey ) {
            this.finish()
            return
          } else {
            this.paper.cursor.move({
              row: this.paper.cursor.row + 1,
              col: this.text.col})
          }
          break;
        default:
//            if( e.ctrlKey && e.shiftKey && e.key="S" ) {
//              this.composing = true;
//            }
          if( e.ctrlKey ) {
            console.log("^"+e.key)
            console.log("+"+e.isComposing)
          } else {
            if( e.key.length == 1 ) {
              this.text.put(e.key, this.paper.cursor.row, this.paper.cursor.col)
              this.paper.cursor.move({row: this.paper.cursor.row, col: this.paper.cursor.col + 1})
            } else {
              console.log(e.key)
            }
          }
          break;
      }
      this.paper.buffer.clear()
      this.text.draw(this.paper.turtle)
      this.paper.cursor.draw()
    }
  }

  cancel() {
    this.text = null
    this.finish();
  }

  finish() {
    if( this.text && (this.text.buffer.width > 0 || this.text.buffer.height > 0)) {
      this.paper.objects.push(this.text)
    }
    this.charPos = 0
    this.paper.buffer.clear()
    this.paper.redraw()
    this.paper.cursor.setMouse()
    if( this.text ) {
      this.paper.cursor.move({row: this.text.row, col: this.text.col})
    }
    this.text = null
    this.drawing = false
  }
}

class Text extends DrawObject {
  constructor(row, col) {
    super(row, col)
    this.buffer = new Buffer()
  }

  put(key, row, col) {
    this.buffer.put(key, row, col)
    this.row = this.buffer.minRow
    this.col = this.buffer.minCol
    this.width = this.buffer.width
    this.height = this.buffer.height
  }

  delete(row, col) {
    this.buffer.delete(row, col)
    this.row = this.buffer.minRow
    this.col = this.buffer.minCol
    this.width = this.buffer.width
    this.height = this.buffer.height
  }

  draw(turtle) {
    this.buffer.rows.forEach( (cols, row) => {
      cols.forEach( (char, col) => {
        turtle.goto(row,col).write(char)
      })
    })
  }
}

/* eslint-disable-next-line no-unused-vars */
class BoxTool extends AbstractTool{
  cancel() {
    this.box = null
    this.finish();
  }

  finish() {
    if( this.box &&
      (this.box.width !=0 || this.box.height !=0) ) {
      this.paper.objects.push(this.box)
    }
    this.box = null
    this.drawing = false
    this.paper.buffer.clear()
    this.paper.redraw()
  }

  cursorDown(e) {
    this.box = new Box(e.row, e.col)
    this.drawing = true;
  }

  cursorUp(e) {
    this.setCorner(e.row, e.col, e.ctrlKey)
    this.finish()
  }

  cursorMove(e) {
    if(this.drawing) {
      this.setCorner(e.row, e.col, e.ctrlKey)
      this.paper.redraw()
      this.paper.buffer.clear()
      this.box.draw(this.paper.turtle)
    }
    super.cursorMove(e)
  }

  setCorner(row, col, square) {
    let width = col - this.box.col
    let height = row - this.box.row

    if( square ) {
      const side = Math.min(Math.abs(width)*paper.charSize.width, Math.abs(height)*paper.charSize.height)
      width = Math.round(Math.sign(width) * side / paper.charSize.width)
      height = Math.round(Math.sign(height) * side / paper.charSize.height)
    }
    this.box.setDim(width + 1, height + 1)
  }
}

class Box extends DrawObject {
  setPoint(row, col) {
    this.row = row
    this.col = col
  }

  setDim(width, height) {
    this.width = width
    this.height = height
  }

  draw(turtle) {
    let row = this.row
    let col = this.col
    let width = this.width - 1
    let height = this.height - 1

    if( width < 0 ) {
      col += width
      width = -width
    }

    if( height < 0 ) {
      row += height
      height = -height
    }

    turtle.goto(row, col)
    if( width>0 && height>0 ) {
      turtle.direction = EAST
      turtle.step().goto(row, col+1)
        .draw(width-1).turn( RIGHT )
        .draw(height-1).turn( RIGHT )
        .draw(width-1).turn( RIGHT )
        .draw(height-1).turn( RIGHT )
    }
    else if( width > 0 ) {
      turtle.direction = EAST
      turtle.draw(width+1)
    }
    else if( height > 0 ) {
      turtle.direction = SOUTH
      turtle.draw(height+1)
    }
  }
}

const CURSOR_MOUSE = 'm'
const CURSOR_KEYBOARD = 'k'
class Cursor {
  constructor(paper) {
    this.paper = paper
    this.row = 0
    this.col = 0
    this.cursorMode = CURSOR_MOUSE
    this.cursorChar = {
      'm': '\u2588',
      'k': '|'
    }
  }

  setKeyboard() {
    if( this.cursorMode != CURSOR_KEYBOARD ) {
      this.cursorMode = CURSOR_KEYBOARD
      this.move({row: this.row, col: this.col}, true)
    }
  }

  setMouse() {
    if( this.cursorMode != CURSOR_MOUSE ) {
      this.cursorMode = CURSOR_MOUSE
      this.move({row: this.row, col: this.col}, true)
    }
  }

  move(e,force) {
    if( this.row != e.row ||
      this.col != e.col ||
      force) {
      this.paper.redrawCell(this.row, this.col)
      this.paper.redrawCell(this.row+1, this.col)
      this.paper.redrawCell(this.row-1, this.col)
      this.paper.redrawCell(this.row, this.col+1)
      this.paper.redrawCell(this.row, this.col-1)
      this.paper.highlight()
      this.row = e.row
      this.col = e.col
      this.paper.drawCursor(this.cursorChar[this.cursorMode], this.row, this.col)
      updatePositionStatus(this.row, this.col)
    }
  }

  draw() {
    this.paper.drawCursor(this.cursorChar[this.cursorMode], this.row, this.col)
  }

  keydown(e){
    e.row = this.row
    e.col = this.col
    switch( e.key ) {
      case 'ArrowUp':
        e.row -= 1
        break;
      case 'ArrowDown':
        e.row += 1
        break;
      case 'ArrowRight':
        e.col += 1
        break;
      case 'ArrowLeft':
        e.col -= 1
        break;
    }
    this.move(e)
  }
}

class Paper {
  constructor(canvas) {
    this.canvas = canvas
    this.padding = { x:0, y:0 }
    this.objects = []
    this.fontFamily = "Monospace"
    this.fontHeight = 40
    this.cursor = new Cursor(this)
    // this.objectBuffer = new Buffer()
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
    //bufferContext.fillRect(0,fontHeight,width,fontHeight)

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
    console.log(`boundingTop = ${boundingTop}`)

    console.log(`n = ${4*(boundingTop+1)}`)
    for(let n=4*(boundingTop+1); n<this.fontHeight*3*4; n+=4) {
      if(imageData.data[n]==0) {
        boundingBottom = n/4
        break
      }
    }
    console.log(`boundingBottom = ${boundingBottom}`)
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

  drawObjects() {
    this.buffer = this.paperBuffer
    this.buffer.clear()
    // this.objectBuffer.clear()
    for( let object of this.objects ) {
      object.draw(this.turtle)
    }
    this.buffer = this.toolBuffer
  }

  highlight() {
    this.objects.filter(o => o.isSelected()).forEach(o => {
      this.ctx.strokeStyle = '#0000ff'
      this.ctx.lineWidth = 4
      this.ctx.strokeRect(this.col2x(o.left()), this.row2y(o.top()), this.col2x(o.width), this.row2y(o.height))
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
    this.drawGrid()
    this.drawObjects()
    this.highlight()
  }
}

class Toolbox {
  constructor(icons, paper) {
    this.icons = icons
    this.paper = paper
    this.tools = new Map()
    this.shortcuts = new Map()
    const toolbox = this
    icons.forEach( i => {
      i.addEventListener('click', (e) => toolbox.iconClick(e))
      const toolName = i.dataset.tool
      const toolClass = eval(toolName)
      const tool = new toolClass(paper)
      this.tools.set(toolName, tool)
      this.shortcuts.set(toolName.substring(0,1).toLowerCase(), toolName)
    })
    this.iconClick( {target: icons[0]})
  }

  iconClick(e) {
    this.startTool(e.target.dataset.tool)
  }

  selectTool(shortcut) {
    console.log(`'${shortcut}'`)
    this.startTool(this.shortcuts.get(shortcut))
  }

  startTool(toolName) {
    this.icons.forEach( i => {
      if( toolName == i.dataset.tool ) {
        i.classList.add('selected')
      } else {
        i.classList.remove('selected')
      }
    })
    if( this.selectedTool ) {
      this.selectedTool.finish()
    }
    this.selectedTool = this.tools.get(toolName)
    this.paper.setEventHandler(this.selectedTool)
    console.log(this.selectedTool)
  }
}

function updatePositionStatus(row, col) {
  document.getElementById('position').innerText = `(${row.toString().padStart(3,' ')},${col.toString().padStart(3,' ')})`
}

let paper, toolbox
//const lineEventHandler = new LineArtist()
//const boxEventHandler = new BoxArtist()
// const logEventHandler = {
  // cursorDown:  (row,col) => console.log(`cursorDown(${row},${col})`),
  // cursorUp:  (row,col) => console.log(`cursorUp(${row},${col})`),
  // cursorClick: (row,col) => console.log(`cursorClick(${row},${col})`),
  // cursorMove:  (row,col) => console.log(`cursorMove(${row},${col})`)
// }

function init() {
  paper = new Paper(document.getElementById('canvas'))
  toolbox = new Toolbox(document.querySelectorAll('.menu .icon'), paper)
  paper.toolbox = toolbox
  // cursor = new Cursor(paper, toolbox)
}

window.addEventListener('DOMContentLoaded',init)
