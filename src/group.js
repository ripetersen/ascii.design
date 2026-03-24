import { DrawObject } from './abstractTool.js'

export class Group extends DrawObject {
  constructor(children) {
    super(0, 0)          // DrawObject sets this.row/col via setters (no-op while children unset)
    this.children = children
  }

  // ── Bounds derived from children ─────────────────────────────────────────

  get top()    { return this.children?.length ? Math.min(...this.children.map(c => c.top))    : 0 }
  get bottom() { return this.children?.length ? Math.max(...this.children.map(c => c.bottom)) : 0 }
  get left()   { return this.children?.length ? Math.min(...this.children.map(c => c.left))   : 0 }
  get right()  { return this.children?.length ? Math.max(...this.children.map(c => c.right))  : 0 }

  get width()   { return this.children?.length ? this.right  - this.left + 1 : 0 }
  set width(w)  {}   // no-op — DrawObject constructor calls this before children is set
  get height()  { return this.children?.length ? this.bottom - this.top  + 1 : 0 }
  set height(h) {}

  // row/col setters translate all children so that the standard
  // `o.row += dr` / `o.col += dc` pattern in SelectTool moves the whole group.
  get row() { return this.top }
  set row(v) {
    if (!this.children?.length) return
    const dr = v - this.top
    if (dr !== 0) this.children.forEach(c => { c.row += dr })
  }

  get col() { return this.left }
  set col(v) {
    if (!this.children?.length) return
    const dc = v - this.left
    if (dc !== 0) this.children.forEach(c => { c.col += dc })
  }

  // ── DrawObject interface ──────────────────────────────────────────────────

  get empty() { return !this.children?.length || this.children.every(c => c.empty) }

  // Click hits the group if it lands on any child's content.
  contains(row, col) {
    return this.children.some(c => c.contains(row, col))
  }

  draw(turtle) {
    this.children.forEach(c => c.draw(turtle))
  }

  toJSON() {
    return { type: 'Group', children: this.children.map(c => c.toJSON()) }
  }
}
