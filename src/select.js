import {AbstractTool} from './abstractTool.js'
import {Group} from './group.js'
import {Buffer} from './buffer.js'

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
      case 'a':
        if(e.ctrlKey) {
          this.paper.allObjects().forEach(o => o.select())
          this.paper.redraw()
          this.paper.cursor.draw()
        }
        break;
      case 'c':
        if(e.ctrlKey) {
          this._copyToClipboard()
        }
        break;
      case 'g':
      case 'G':
        if (e.ctrlKey && e.shiftKey) {
          this._ungroup()
        } else if (e.ctrlKey) {
          this._group()
        }
        break
      case 'Escape':
        this.paper.allObjects().forEach(o => o.deselect())
        this.paper.redraw()
        this.paper.cursor.draw()
        break;
      case ' ': {
        const row = this.paper.cursor.row
        const col = this.paper.cursor.col
        const hit = this.paper.objectsAt(row, col)[0]
        if (hit) {
          if (e.shiftKey) {
            hit.toggleSelect()
          } else {
            this.paper.allObjects().forEach(o => o.deselect())
            hit.select()
          }
          this.paper.redraw()
          this.paper.cursor.draw()
        }
        break
      }
      case 'Enter':
        e.row = this.paper.cursor.row
        e.col = this.paper.cursor.col
        this.cursorClick(e)
        break;
      case 'ArrowUp':
        this.paper.selectedObjects().map(o => o.row -= 1)
        this.paper.redraw()
        this.paper.save()
        break;
      case 'ArrowDown':
        this.paper.selectedObjects().map(o => o.row += 1)
        this.paper.redraw()
        this.paper.save()
        break;
      case 'ArrowRight':
        this.paper.selectedObjects().map(o => o.col += 1)
        this.paper.redraw()
        this.paper.save()
        break;
      case 'ArrowLeft':
        this.paper.selectedObjects().map(o => o.col -= 1)
        this.paper.redraw()
        this.paper.save()
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
      // No exact hit — allow drag if the click is inside a selected object's bbox
      this.drag.dragging = this.paper.selectedObjects()
        .some(o => o.containsBoundingBox(e.row, e.col))
    }
    this.paper.redraw()
    this.paper.cursor.draw()
    super.cursorDown(e)
  }

  cursorUp(e) {
    if (this.drag.dragged) {
      this.paper.save()
    }
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

  _group() {
    const selected = this.paper.selectedObjects()
    if (selected.length < 2) return
    const group = new Group(selected)
    this.paper.deleteObject(...selected)
    this.paper.addObject(group)
    group.select()
    this.paper.redraw()
    this.paper.cursor.draw()
  }

  _ungroup() {
    const groups = this.paper.selectedObjects().filter(o => o instanceof Group)
    if (!groups.length) return
    groups.forEach(group => {
      this.paper.deleteObject(group)
      this.paper.addObject(...group.children)
    })
    this.paper.redraw()
    this.paper.cursor.draw()
  }

  _copyToClipboard() {
    const selected = this.paper.selectedObjects()
    const objects = selected.length > 0 ? selected : this.paper.allObjects()
    if (!objects.length) return

    const buf = new Buffer()
    const prevCompose = this.paper.turtle.compose
    this.paper.turtle.compose = false
    this.paper.drawChar = (c, row, col) => buf.put(c, row, col)
    try {
      objects.forEach(o => o.draw(this.paper.turtle))
    } finally {
      delete this.paper.drawChar
      this.paper.turtle.compose = prevCompose
    }

    const top    = Math.min(...objects.map(o => o.top))
    const bottom = Math.max(...objects.map(o => o.bottom))
    const left   = Math.min(...objects.map(o => o.left))
    const right  = Math.max(...objects.map(o => o.right))

    let text = ''
    for (let r = top; r <= bottom; r++) {
      let line = ''
      for (let c = left; c <= right; c++) {
        line += buf.has(r, c) ? buf.get(r, c) : ' '
      }
      text += line.trimEnd() + '\n'
    }
    navigator.clipboard.writeText(text.trimEnd())
  }

  finish() {
    this.paper.allObjects().forEach(o => o.deselect())
    this.paper.redraw()
    this.paper.cursor.draw()
  }
}
