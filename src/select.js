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
    this.drag.dragged = false
    const hit = this.paper.objectsAt(e.row, e.col)[0]
    if (hit) {
      if (e.shiftKey) {
        hit.toggleSelect()
      } else if (!hit.isSelected()) {
        // Clicking an unselected object: select it immediately so drag works in one gesture
        this.paper.allObjects().forEach(o => o.deselect())
        hit.select()
      }
      // If hit is already selected (possibly multi-select), keep all selected for dragging
      this.drag.dragging = true
    } else {
      this.drag.dragging = false
    }
    this.paper.redraw()
    this.paper.cursor.draw()
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
    if (this.drag.dragged) {
      this.drag.dragged = false
      return
    }
    const hit = this.paper.objectsAt(e.row, e.col)[0]
    if (!e.shiftKey) {
      if (!hit) {
        // Click on empty space: deselect all
        this.paper.allObjects().forEach(o => o.deselect())
      } else if (this.paper.selectedObjects().length > 1) {
        // Click (no drag) on one of multiple selected objects: reduce to just this one
        this.paper.allObjects().forEach(o => o.deselect())
        hit.select()
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
