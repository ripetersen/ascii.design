export class AbstractTool {
  constructor(paper) {
    this.paper = paper
    this.drawing = false;
  }

  /* Add point if the direction changes by key chess*/
  keydown(e){
    switch( e.key ) {
      case 'ArrowUp':
        this.paper.cursor.up()
        e.row=this.paper.cursor.row
        e.col=this.paper.cursor.col
        this.cursorMove(e)
        break;
      case 'ArrowDown':
        this.paper.cursor.down()
        e.row=this.paper.cursor.row
        e.col=this.paper.cursor.col
        this.cursorMove(e)
        break;
      case 'ArrowRight':
        this.paper.cursor.right()
        e.row=this.paper.cursor.row
        e.col=this.paper.cursor.col
        this.cursorMove(e)
        break;
      case 'ArrowLeft':
        this.paper.cursor.left()
        e.row=this.paper.cursor.row
        e.col=this.paper.cursor.col
        this.cursorMove(e)
        break;
    }
  }

  // Just forward the move on to the paper's cursor
  cursorMove(e) {
    this.paper.cursor.move(e)
  }

  edit() { throw new Error("subclass should implement edit()") }

  cursorDown() {}
  cursorUp() {}
  cursorClick() {}
  cursorDoubleClick() {}
  cancel() {}
  finish() {}
}

export class DrawObject {
  constructor(row, col, width, height) {
    this.row = row
    this.col = col
    this.width = width == undefined ? 0 : width
    this.height = height == undefined ? 0 : height
    this.selected = false
  }
  get empty() { return false; }

  select() { this.selected = true}
  deselect() { this.selected = false}
  toggleSelect() { this.selected = !this.selected }
  isSelected() { return this.selected }

  get left() { return this.col }
  get right() { return this.col+this.width-Math.sign(this.width) }
  get top() { return this.row }
  get bottom() { return this.row+this.height-Math.sign(this.height) }

  contains(row, col) {
    return row >= this.top  && row <= this.bottom &&
           col >= this.left && col <=this.right
  }
}
