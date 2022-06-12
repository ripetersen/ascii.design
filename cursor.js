const CURSOR_MOUSE = 'm'
const CURSOR_KEYBOARD = 'k'

export class Cursor extends EventTarget {
  constructor(paper) {
    super()
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

  up() {
    this.move({row: this.row - 1, col: this.col})
  }

  down() {
    this.move({row: this.row + 1, col: this.col})
  }

  left() {
    this.move({row: this.row, col: this.col - 1})
  }

  right() {
    this.move({row: this.row, col: this.col + 1})
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
      const changeEvent = new CustomEvent('change',{detail: {row: this.row, col: this.col}})
      this.dispatchEvent(changeEvent)
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
