import {AbstractTool, DrawObject} from './abstractTool.js'

export class Line extends DrawObject {
  constructor(row, col) {
    super(row, col)
    this.row = row
    this.col = col
    this.points = [{row:0, col:0}]  // confirmed points only; index 0 is the anchor
    // Actual bounding-box top-left (updated by draw(); defaults to anchor)
    this._minRow = row
    this._minCol = col
  }

  // Override DrawObject getters: use the actual trip bounding box, not the anchor
  get top()    { return this._minRow }
  get left()   { return this._minCol }
  get bottom() { return this._minRow + this.height - 1 }
  get right()  { return this._minCol + this.width - 1 }

  // Recompute the set of grid cells this line actually occupies.
  // Mirrors the geometry of turtle.drawTo() so contains() is precise.
  _updateCells() {
    this._cells = new Set()
    if (this.points.length < 2) return
    let curRow = this.points[0].row + this.row
    let curCol = this.points[0].col + this.col
    for (let n = 1; n < this.points.length; n++) {
      const destRow = this.points[n].row + this.row
      const destCol = this.points[n].col + this.col
      const dr = destRow - curRow
      const dc = destCol - curCol
      const distance = Math.max(Math.abs(dr), Math.abs(dc))
      if (distance === 0) continue
      // dominant axis (matches turtle.calculateDirection)
      const rStep = Math.abs(dc) > Math.abs(dr) ? 0 : Math.sign(dr)
      const cStep = Math.abs(dc) > Math.abs(dr) ? Math.sign(dc) : 0
      for (let i = 0; i < distance; i++) {
        this._cells.add(`${curRow + i * rStep},${curCol + i * cStep}`)
      }
      curRow = destRow
      curCol = destCol
    }
    this._cells.add(`${curRow},${curCol}`)  // final turtle.draw() position
  }

  contains(row, col) {
    if (!super.contains(row, col)) return false
    if (!this._cells) return true  // before first draw, fall back to bbox
    return this._cells.has(`${row},${col}`)
  }

  draw(turtle) {
    if (this.points.length < 2) {
      this.width = 0
      this.height = 0
      return
    }
    const prevCompose = turtle.compose
    turtle.compose = true
    turtle.goto( this.points[0].row+this.row, this.points[0].col+this.col )
    turtle.trip.reset()
    turtle.face(this.points[1].row+this.row, this.points[1].col+this.col)

    for(let n=1; n<this.points.length; n++) {
      turtle.drawTo(this.points[n].row+this.row, this.points[n].col+this.col)
    }
    this.width = turtle.trip.width
    this.height = turtle.trip.height
    this._minRow = turtle.trip.min.row
    this._minCol = turtle.trip.min.col
    const endRow = turtle.row
    const endCol = turtle.col
    turtle.draw()
    turtle.compose = prevCompose
    turtle.verifyEndpoint(endRow, endCol)
    this._updateCells()
  }

  toJSON() {
    return { type: 'Line', row: this.row, col: this.col,
             points: this.points.map(p => ({ row: p.row, col: p.col })) }
  }
}

export class LineTool extends AbstractTool {

  // Exit drawing, discard the entire line including committed segments
  cancel() {
    this.line = null
    this.pending = []
    this.finish()
  }

  // Commit the line (confirmed points only) to the paper
  finish() {
    if (this.line && this.line.points.length >= 2) {
      this.paper.addObject(this.line)
    }
    this.line = null
    this.pending = []
    this.drawing = false
    this._lastKeyDir = null
    this.paper.buffer.clear()
    this.paper.redraw()
  }

  // Auto-commit the current cursor position as a confirmed point.
  // Called when the drawing axis changes (H→V or V→H) via arrow keys.
  _autoCommitAtCursor() {
    const row = this.paper.cursor.row
    const col = this.paper.cursor.col
    if (!this.pending || this.pending.length === 0) this._updatePending(row, col)
    for (const p of this.pending) {
      this.line.points.push({row: p.row - this.line.row, col: p.col - this.line.col})
    }
    // pending will be reset by the subsequent cursorMove
  }

  keydown(e){
    let cursorPosition = {row:this.paper.cursor.row, col:this.paper.cursor.col}
    switch( e.key ) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight': {
        const isVertical = e.key === 'ArrowUp' || e.key === 'ArrowDown'
        const newDir = isVertical ? 'V' : 'H'
        const newRow = cursorPosition.row + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0)
        const newCol = cursorPosition.col + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0)
        if (this.drawing && this.line && this._lastKeyDir && this._lastKeyDir !== newDir) {
          this._autoCommitAtCursor()
        }
        if (this.drawing) this._lastKeyDir = newDir
        this.cursorMove({row: newRow, col: newCol})
        break
      }
      case 'Escape':
        this.cancel()
        break;
      case 'Enter':
        e.row = cursorPosition.row
        e.col = cursorPosition.col
        if (!this.drawing) {
          this.cursorDown(e)
          this.cursorClick(e)
        } else {
          // Commit pending segment then finish
          if (this.line && this.pending && this.pending.length > 0) {
            for (const p of this.pending) {
              this.line.points.push({row: p.row - this.line.row, col: p.col - this.line.col})
            }
          }
          this.finish()
        }
        break;
      case ' ':
        if (!this.drawing) {
          const hit = this.paper.objectsAt(cursorPosition.row, cursorPosition.col)[0]
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
        }
        break;
      default:
        if( e.altKey && e.key.length == 1) {
          this.paper.toolbox.selectTool(e.key)
        }
    }
  }

  // Recompute the two pending points (elbow + cursor) from the last
  // confirmed point to (cursorRow, cursorCol).  Both are absolute coords.
  // Uses an L-shaped elbow: whichever axis is longer goes first.
  _updatePending(cursorRow, cursorCol) {
    const last = this.line.points[this.line.points.length - 1]
    const lastAbsRow = last.row + this.line.row
    const lastAbsCol = last.col + this.line.col

    const dr = cursorRow - lastAbsRow
    const dc = cursorCol - lastAbsCol

    let elbowRow, elbowCol
    if (Math.abs(dr) >= Math.abs(dc)) {
      // Vertical segment first, then horizontal
      elbowRow = cursorRow
      elbowCol = lastAbsCol
    } else {
      // Horizontal segment first, then vertical
      elbowRow = lastAbsRow
      elbowCol = cursorCol
    }

    this.pending = [
      {row: elbowRow, col: elbowCol},
      {row: cursorRow, col: cursorCol}
    ]
  }

  // Draw confirmed segments (if any) then the pending elbow preview.
  _drawPreview() {
    const turtle = this.paper.turtle
    this.paper.buffer.clear()

    if (this.line.points.length >= 2) {
      // Draw confirmed segments; line.draw() ends by calling turtle.draw()
      // which writes the endpoint char and steps 1 cell past it.
      this.line.draw(turtle)
      // Step back to the actual last confirmed point so the pending
      // drawing can attach the correct corner character.
      const last = this.line.points[this.line.points.length - 1]
      turtle.goto(last.row + this.line.row, last.col + this.line.col)
      // turtle.direction is still the exit direction of the last confirmed segment ✓
    } else {
      // Only the anchor exists — position turtle and face the first pending
      // point so the opening character is a straight segment, not a corner.
      turtle.goto(this.line.row, this.line.col)
      if (this.pending.length > 0) {
        turtle.face(this.pending[0].row, this.pending[0].col)
      }
    }

    turtle.compose = true
    for (const p of this.pending) {
      turtle.drawTo(p.row, p.col)
    }
    if (this.pending.length > 0) {
      const endRow = turtle.row
      const endCol = turtle.col
      turtle.draw()
      turtle.verifyEndpoint(endRow, endCol)
    }
    turtle.compose = false
  }

  cursorClick(e) {
    this.drawing = true

    if (!this.line) {
      // First click: start the line
      this.line = new Line(e.row, e.col)
      this.pending = []
      return
    }

    if (e.ctrlKey) return this.finish()

    // Ensure pending is populated (cursorMove may not have fired between clicks)
    if (!this.pending || this.pending.length === 0) {
      this._updatePending(e.row, e.col)
    }

    // Commit the pending elbow+cursor as confirmed points
    for (const p of this.pending) {
      this.line.points.push({row: p.row - this.line.row, col: p.col - this.line.col})
    }

    // Reset pending from the new cursor position (zero-length until next move)
    this._updatePending(e.row, e.col)
    this._lastKeyDir = null

    this.paper.redraw()
    this._drawPreview()
  }

  cursorDoubleClick() {
    // The click event that precedes dblclick already committed the pending
    // segment, so just finish — the confirmed line is complete.
    return this.finish()
  }

  cursorMove(e) {
    if(this.drawing) {
      this._updatePending(e.row, e.col)
      this.paper.redraw()
      this._drawPreview()
    }
    super.cursorMove(e)
  }
}
