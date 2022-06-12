import {AbstractTool, DrawObject} from './abstractTool.js'

export class PenTool extends AbstractTool {
  cancel() {
    this.penline = null
    this.finish();
  }

  finish() {
    if( this.penline) {
      this.paper.addObject(this.penline)
    }
    this.lenline = null
    this.drawing = false
    this.paper.buffer.clear()
    this.paper.redraw()
  }

  cursorDown(e) {
    this.penline = new PenLine(e.row, e.col)
    this.drawing = true;
  }

  cursorUp() {
    this.finish()
  }

  cursorMove(e) {
    if(this.drawing) {
      this.penline.add(e.row, e.col)
      this.paper.redraw()
      this.paper.buffer.clear()
      this.penline.draw(this.paper.turtle)
    }
    super.cursorMove(e)
  }
}

class PenLine extends DrawObject {
  constructor(row, col) {
    super(row, col)
    this.row = row
    this.col = col
    this.rows = new Map()
    this.add(row, col)
  }

  add(row, col) {
    let cols = this.rows.get(row)
    if( !cols ) {
      cols = new Set()
      this.rows.set(row, cols)
    }
    cols.add(col)
  }

  draw(turtle) {
    for( let [row,cols] of  this.rows.entries()) {
      for(let col of cols) {
        turtle.goto(row,col).write('*')
      }
    }
  }

  contains(row, col) {
    return this.rows.has(row) && this.rows.get(row).has(col)
  }
}
