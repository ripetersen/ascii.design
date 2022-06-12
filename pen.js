import {AbstractTool} from './abstractTool.js'
import {Text} from './text.js'

class PenLine extends Text {
  constructor(row, col) {
    super(row, col)
    this.char="*"
    this.put(row, col)
  }

  put(row, col) {
    super.put(this.char, row, col)
  }
}

export class PenTool extends AbstractTool {
  static produces = PenLine

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

  keydown(e){
    if( !this.drawing ) {
      switch( e.key ) {
        case ' ':
        case 'Enter':
          this.cursorDown(e);
          break;
        default:
          super.keydown(e)
      }
    } else {
      switch( e.key ) {
        case 'Enter':
        case ' ':
        case 'Escape':
          this.cursorUp()
          break;
        default:
          super.keydown(e)
          break;
      }
    }
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
      this.penline.put(e.row, e.col)
      this.paper.redraw()
      this.paper.buffer.clear()
      this.penline.draw(this.paper.turtle)
    }
    super.cursorMove(e)
  }
}

