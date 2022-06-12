import {AbstractTool, DrawObject} from './abstractTool.js'

export class LineTool extends AbstractTool {
  cancel() {
    this.line = null
    this.finish();
  }

  finish() {
    if( this.line ) {
      this.paper.addObject(this.line)
    }
    this.line = null
    this.drawing = false
    this.paper.buffer.clear()
    this.paper.redraw()
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


  cursorClick(e) {
    this.drawing = true;
    if( !this.line ) {
      this.line = new Line(e.row, e.col)
      return
    }
    if( e.ctrlKey ) return this.finish()
    this.line.add(e.row, e.col)
    this.paper.redraw()
    this.paper.buffer.clear()
    this.line.draw(this.paper.turtle)
  }

  cursorDoubleClick() {
    return this.finish()
  }

  cursorMove(e) {
    if(this.drawing) {
      let n = this.line.points.length - 2
      let row = e.row
      let col = e.col
      let height = row - this.line.points[n].row
      let width = col - this.line.points[n].col
      if(Math.abs(height) > Math.abs(width)) {
        col = this.line.points[n].col
      } else {
        row = this.line.points[n].row
      }
      this.line.update(row, col)
      this.paper.redraw()
      this.paper.buffer.clear()
      this.line.draw(this.paper.turtle)
    }
    super.cursorMove(e)
  }
}

/* eslint-disable-next-line no-unused-vars */
class Line extends DrawObject {
  constructor(row, col) {
    super(row, col)
    this.row = row
    this.col = col
    this.points = [{row, col}, {row,col}]
  }

  add(row, col) {
    this.points.push({row, col})
  }

  update(row, col) {
    this.points[this.points.length-1].row = row
    this.points[this.points.length-1].col = col
  }

  draw(turtle) {
    turtle.goto( this.points[0].row, this.points[0].col )
    turtle.trip.reset()
    turtle.face(this.points[1].row, this.points[1].col)

    for(let n=1; n<this.points.length; n++) {
      turtle.drawTo(this.points[n].row, this.points[n].col)
    }
    this.width = turtle.trip.width
    this.height = turtle.trip.height
    this.col = turtle.trip.min.col
    this.row = turtle.trip.min.row
    turtle.draw()
  }
}
