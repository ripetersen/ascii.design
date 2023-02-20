import {AbstractTool, DrawObject} from './abstractTool.js'

class Box extends DrawObject {
  get empty() {
    return this.width==1 || this.height==1
  }

  setPoint(row, col) {
    this.row = row
    this.col = col
  }

  setDim(width, height) {
    this.width = width
    this.height = height
  }

  contains(row, col) {
    return super.contains(row, col) &&
      (row == this.top || row == this.bottom ||
      col == this.left || col == this.right)
  }

  draw(turtle) {
    const width = this.width - Math.sign(this.width)
    const height = this.height - Math.sign(this.height)

    turtle.goto(this.row, this.col)
    turtle.face(this.row, this.col+width)

    turtle.drawTo(this.row         , this.col + width)
    turtle.drawTo(this.row + height, this.col + width)
    turtle.drawTo(this.row + height, this.col)
    turtle.drawTo(this.row         , this.col)
    turtle.drawTo(this.row         , this.col + width)
  }
}

export class BoxTool extends AbstractTool {
  static produces = Box;
  cancel() {
    this.box = null
    this.finish();
  }

  edit(box) {
    this.box = box;
  }

  finish() {
    if( this.box &&
      (Math.abs(this.box.width) > 1 || Math.abs(this.box.height) > 1) ) {
      this.box.col = Math.min(this.box.left, this.box.right)
      this.box.row = Math.min(this.box.top, this.box.bottom)
      this.box.width = Math.abs(this.box.width)
      this.box.height = Math.abs(this.box.height)
      this.paper.addObject(this.box)
    }
    this.box = null
    this.drawing = false
    this.paper.buffer.clear()
    this.paper.redraw()
  }

  keydown(e){
    if( this.drawing ) {
      switch( e.key ) {
        case 'Enter':
        case ' ':
        case 'Esc':
          this.cursorUp(e);
          break;
        default:
          super.keydown(e)
      }
    } else {
      switch( e.key ) {
        case 'Enter':
        case ' ':
          this.cursorDown(e);
          break;
        default:
          super.keydown(e)
      }
    }
  }

  cursorDown(e) {
    if(!this.box) this.box = new Box(e.row, e.col)
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
      this.paper.cursor.draw()
    }
    super.cursorMove(e)
  }

  setCorner(row, col, square) {
    let width = col - this.box.col
    let height = row - this.box.row

    if( square ) {
      const side = Math.min(Math.abs(width)*this.paper.charSize.width, Math.abs(height)*this.paper.charSize.height)
      width = Math.round(Math.sign(width) * side / this.paper.charSize.width)
      height = Math.round(Math.sign(height) * side / this.paper.charSize.height)
    }
    this.box.setDim(width + Math.sign(width), height + Math.sign(height))
  }
}

