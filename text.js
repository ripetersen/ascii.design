import {AbstractTool, DrawObject} from './abstractTool.js'
import {Buffer} from './buffer.js'

export class Text extends DrawObject {
  constructor(row, col) {
    super(row, col)
    this.chars = new Map()
    this.buffer = new Buffer()
  }

  get empty() {
    return this.buffer.rows.size==0
  }

  put(key, row, col) {
    row -= this.row
    col -= this.col
    this.buffer.put(key, row, col)
  }

  get left() { return this.col+this.buffer.minCol }
  get right() { return this.col+this.buffer.maxCol }
  get top() { return this.row+this.buffer.minRow }
  get bottom() { return this.row+this.buffer.maxRow }
  get width() { return this.buffer.width }
  get height() { return this.buffer.height }
  set width(w) { }
  set height(h) { }

  delete(row, col) {
    row -= this.row
    col -= this.col
    this.buffer.delete(row, col)
  }

  draw(turtle) {
    this.buffer.rows.forEach( (cols, row) => {
      cols.forEach( (char, col) => {
        turtle.goto(this.row+row,this.col+col).write(char)
      })
    })
  }
}

export class TextTool extends AbstractTool{
  static produces = Text;
  constructor(paper) {
    super(paper)
    this.composing = false;
    // Position in the string
    //this.charPos = 0;
    // Position of the cursor on the paper
  }

  edit(text,e) {
    this.start(text, e)
  }

  cursorClick(e) {
    if( this.text ) {
      this.finish()
    }
    var text = new Text(e.row, e.col)
    this.start(text, e)
  }

  start(text,e) {
    this.text = text
    //  this.charPos = 0;
    this.typingCursor = {row: e.row, col: e.col}
    this.paper.cursor.setKeyboard()
    this.paper.cursor.move(e)
    this.drawing = true
  }

  keydown(e){
    if( !this.drawing ) {
      switch( e.key ) {
        case 'Enter':
          this.cursorClick(e);
          break;
        default:
          super.keydown(e)
      }
    } else {
      this.paper.cursor.move(this.typingCursor)
      switch( e.key ) {
        case 'ArrowUp':
          this.paper.cursor.up()
          break;
        case 'ArrowDown':
          this.paper.cursor.down()
          break;
        case 'ArrowRight':
          this.paper.cursor.right()
          break;
        case 'ArrowLeft':
          this.paper.cursor.left()
          break;
        case 'Delete':
          this.text.delete(this.paper.cursor.row, this.paper.cursor.col)
          break;
        case 'Backspace':
          this.paper.cursor.left()
          this.text.delete(this.paper.cursor.row, this.paper.cursor.col)
          break;
        case 'Escape':
          this.finish()
          return
        case 'Enter':
          if( e.ctrlKey ) {
            this.finish()
            return
          } else {
            this.paper.cursor.move({ row: this.paper.cursor.row + 1, col: this.text.col})
          }
          break;
        default:
//            if( e.ctrlKey && e.shiftKey && e.key="S" ) {
//              this.composing = true;
//            }
          if( e.ctrlKey ) {
            if( e.key=='c' ) {
              this.cancel()
              return
            }
            if( e.key=='v' ) {
              navigator.clipboard.readText().then( t => this.paste(t) )
            }
            console.log("^"+e.key)
            console.log("+"+e.isComposing)
          } else {
            if( e.key.length == 1 ) {
              this.text.put(e.key, this.paper.cursor.row, this.paper.cursor.col)
              this.paper.cursor.right()
            }
          }
          break;
      }
      this.typingCursor = {row: this.paper.cursor.row, col: this.paper.cursor.col}
      this.paper.buffer.clear()
      this.text.draw(this.paper.turtle)
      this.paper.cursor.draw()
    }
  }

  paste(string) {
    this.paper.cursor.move(this.typingCursor)
    for( let c of string ) {
      if( c== '\n' ) {
        this.paper.cursor.move({ row: this.paper.cursor.row + 1, col: this.text.col})
      } else {
        this.text.put(c, this.paper.cursor.row, this.paper.cursor.col)
        this.paper.cursor.move({row: this.paper.cursor.row, col: this.paper.cursor.col + 1})
      }
    }
    this.typingCursor = {row: this.paper.cursor.row, col: this.paper.cursor.col}
    this.paper.buffer.clear()
    this.text.draw(this.paper.turtle)
    console.log(this.paper.cursor)
    this.paper.cursor.draw()
  }

  cancel() {
    this.text = null
    this.finish();
  }

  finish() {
    if( this.text && (this.text.buffer.width > 0 || this.text.buffer.height > 0)) {
      this.paper.addObject(this.text)
    }
    // this.charPos = 0
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

