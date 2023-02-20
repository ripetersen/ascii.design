import {AbstractTool} from './abstractTool.js'

export class SelectTool extends AbstractTool {
  constructor(paper) {
    super(paper)
    this.drag = {
      row: null,
      col: null,
      dragging: false
    }
  }
  keydown(e){
    switch( e.key ) {
      case 'Backspace':
      case 'Delete':
        this.paper.deleteObject(...this.paper.selectedObjects())
        this.paper.redraw()
        this.paper.cursor.draw()
        break;
      case 'c':
        if(e.ctrlKey) {
          navigator.clipboard.writeText(this.paper.paperBuffer.toString())
        }
        break;
      case 'Escape':
        this.paper.allObjects().forEach(o => o.deselect())
        this.paper.redraw()
        this.paper.cursor.draw()
        break;
      case ' ':
      case 'Enter':
        this.cursorClick(e)
        break;
      case 'ArrowUp':
        this.paper.selectedObjects().map(o => o.row -= 1)
        this.paper.redraw()
        break;
      case 'ArrowDown':
        this.paper.selectedObjects().map(o => o.row += 1)
        this.paper.redraw()
        break;
      case 'ArrowRight':
        this.paper.selectedObjects().map(o => o.col += 1)
        this.paper.redraw()
        break;
      case 'ArrowLeft':
        this.paper.selectedObjects().map(o => o.col -= 1)
        this.paper.redraw()
        break;
    }
    super.keydown(e)
  }

  cursorDown(e) {
    this.drag.row = e.row
    this.drag.col = e.col
    this.drag.dragging = true
    this.drag.dragged = false
    super.cursorDown(e)
  }

  cursorUp(e) {
    this.drag.row = null
    this.drag.col = null
    this.drag.dragging = false
    super.cursorUp(e)
  }

  cursorMove(e) {
    if(this.drag.dragging) {
      this.drag.dragged = true
      let deltaRow = e.row - this.drag.row
      let deltaCol = e.col - this.drag.col
      this.drag.row = e.row
      this.drag.col = e.col
      this.paper.selectedObjects().map(o => {
        o.row += deltaRow;
        o.col += deltaCol;
      })
      this.paper.redraw()
    }
    super.cursorMove(e)
  }

  cursorClick(e) {
    if(this.drag.dragged) {
      this.drag.dragged = false;
      return;
    }

    if( e.shiftKey ) {
      // multi select
      this.paper.objectsAt(e.row, e.col).map(o => o.toggleSelect())
    } else {
      // single-select
      var selected = this.paper.objectsAt(e.row, e.col)[0]
      var selectedObjects = this.paper.selectedObjects();
      if(selectedObjects.length > 1 || selected != selectedObjects[0]) {
        this.paper.selectedObjects().map(o => o.deselect())
        if(selected != null) selected.select()
      } else {
        if(selected != null) selected.toggleSelect()
      }
    }
    this.paper.redraw()
    this.paper.cursor.draw()
  }

  cursorDoubleClick(e) {
    var selected = this.paper.objectsAt(e.row, e.col)[0]
    this.paper.selectedObjects().map(o => o.deselect())
    if(selected != null) {
      this.paper.toolbox.edit(selected, e)
    }
    this.paper.redraw()
    this.paper.cursor.draw()
  }

  finish() {
    this.paper.allObjects().forEach(o => o.deselect())
    this.paper.redraw()
    this.paper.cursor.draw()
  }
}
