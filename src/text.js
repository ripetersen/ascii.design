import {AbstractTool, DrawObject} from './abstractTool.js'

export class Text extends DrawObject {
  constructor(row, col) {
    super(row, col)
    this.lines = ['']
  }

  get empty() { return this.lines.every(l => l === '') }

  get width()  { return Math.max(0, ...this.lines.map(l => l.length)) }
  get height() { return this.lines.length }
  set width(w)  {}
  set height(h) {}

  get left()   { return this.col }
  get right()  { return this.col + this.width - 1 }
  get top()    { return this.row }
  get bottom() { return this.row + this.lines.length - 1 }

  _r(row) { return row - this.row }
  _c(col) { return col - this.col }

  _ensureRow(r) {
    while (this.lines.length <= r) this.lines.push('')
  }

  _trimTrailing() {
    while (this.lines.length > 1 && this.lines[this.lines.length - 1] === '')
      this.lines.pop()
  }

  put(char, row, col) {
    const r = this._r(row), c = this._c(col)
    if (r < 0 || c < 0) return
    this._ensureRow(r)
    while (this.lines[r].length < c) this.lines[r] += ' '
    this.lines[r] = this.lines[r].slice(0, c) + char + this.lines[r].slice(c + 1)
  }

  insert(char, row, col) {
    const r = this._r(row), c = this._c(col)
    if (r < 0 || c < 0) return
    this._ensureRow(r)
    while (this.lines[r].length < c) this.lines[r] += ' '
    this.lines[r] = this.lines[r].slice(0, c) + char + this.lines[r].slice(c)
  }

  delete(row, col) {
    const r = this._r(row), c = this._c(col)
    if (r < 0 || r >= this.lines.length || c < 0 || c >= this.lines[r].length) return
    this.lines[r] = this.lines[r].slice(0, c) + this.lines[r].slice(c + 1)
    this._trimTrailing()
  }

  // Split the line at col; tail moves to a new line inserted below.
  // All subsequent lines shift down automatically (splice).
  insertNewline(row, col) {
    const r = this._r(row), c = this._c(col)
    this._ensureRow(r)
    const tail = this.lines[r].slice(c)
    this.lines[r] = this.lines[r].slice(0, c)
    this.lines.splice(r + 1, 0, tail)
  }

  // Join the line after `row` onto the end of `row`.
  joinLines(row) {
    const r = this._r(row)
    if (r < 0 || r + 1 >= this.lines.length) return
    this.lines[r] = this.lines[r] + this.lines[r + 1]
    this.lines.splice(r + 1, 1)
    this._trimTrailing()
  }

  contains(row, col) {
    const r = this._r(row), c = this._c(col)
    if (r < 0 || r >= this.lines.length || c < 0) return false
    return c < this.lines[r].length && this.lines[r][c] !== ' '
  }

  draw(turtle) {
    this.lines.forEach((line, r) => {
      for (let c = 0; c < line.length; c++) {
        const ch = line[c]
        if (ch !== ' ') turtle.goto(this.row + r, this.col + c).write(ch)
      }
    })
  }

  toJSON() {
    return { type: 'Text', row: this.row, col: this.col, lines: this.lines }
  }
}


export class TextTool extends AbstractTool {
  static produces = Text;
  constructor(paper) {
    super(paper)
    this.composing = false
    this.insertMode = true
  }

  edit(text, e) {
    this.start(text, e)
  }

  cursorClick(e) {
    if (this.text) this.finish()
    const existing = this.paper.objectsAt(e.row, e.col).find(o => o instanceof Text)
    if (existing) { this.edit(existing, e); return }
    this.start(new Text(e.row, e.col), e)
  }

  cursorMove(e) {
    if (!this.drawing) super.cursorMove(e)
  }

  start(text, e) {
    this.text = text
    this.typingCursor = { row: e.row, col: e.col }
    this.paper.cursor.setKeyboard()
    this.paper.cursor.move(e)
    this.drawing = true
  }

  keydown(e) {
    if (!this.drawing) {
      switch (e.key) {
        case 'Enter': this.cursorClick(e); break
        default: super.keydown(e)
      }
      return
    }

    this.paper.cursor.move(this.typingCursor)
    const cur = this.paper.cursor
    const r = cur.row - this.text.row
    const lineLen = r >= 0 && r < this.text.lines.length ? this.text.lines[r].length : 0

    switch (e.key) {
      case 'ArrowLeft':
        if (cur.col > this.text.col) cur.left()
        break

      case 'ArrowRight':
        if (cur.col < this.text.col + lineLen) cur.right()
        break

      case 'ArrowUp': {
        if (cur.row > this.text.row) {
          const tr = cur.row - 1
          const tLen = this.text.lines[tr - this.text.row].length
          this.paper.cursor.move({ row: tr, col: Math.min(cur.col, this.text.col + tLen) })
        }
        break
      }

      case 'ArrowDown': {
        const tr = cur.row + 1
        if (tr <= this.text.row + this.text.lines.length - 1) {
          const tLen = this.text.lines[tr - this.text.row].length
          this.paper.cursor.move({ row: tr, col: Math.min(cur.col, this.text.col + tLen) })
        }
        break
      }

      case 'Delete': {
        if (cur.col - this.text.col < lineLen) {
          this.text.delete(cur.row, cur.col)
        } else if (r + 1 < this.text.lines.length) {
          // at end of line: pull next line up
          this.text.joinLines(cur.row)
        }
        break
      }

      case 'Backspace': {
        if (cur.col > this.text.col) {
          cur.left()
          this.text.delete(cur.row, cur.col)
        } else if (cur.row > this.text.row) {
          // at start of line: join with previous line
          const prevRow = cur.row - 1
          const prevLen = this.text.lines[prevRow - this.text.row].length
          this.text.joinLines(prevRow)
          this.paper.cursor.move({ row: prevRow, col: this.text.col + prevLen })
        }
        break
      }

      case 'Insert':
        this.insertMode = !this.insertMode
        break

      case 'Escape':
        this.finish()
        return

      case 'Enter':
        if (e.ctrlKey) {
          this.finish()
          return
        }
        this.text.insertNewline(cur.row, cur.col)
        this.paper.cursor.move({ row: cur.row + 1, col: this.text.col })
        break

      default:
        if (e.ctrlKey) {
          if (e.key === 'c') { this.cancel(); return }
          if (e.key === 'v') navigator.clipboard.readText().then(t => this.paste(t))
          console.log('^' + e.key)
          console.log('+' + e.isComposing)
        } else if (e.key.length === 1) {
          if (this.insertMode) {
            this.text.insert(e.key, cur.row, cur.col)
          } else {
            this.text.put(e.key, cur.row, cur.col)
          }
          cur.right()
        }
        break
    }

    this.typingCursor = { row: cur.row, col: cur.col }
    this._redrawText()
  }

  _redrawText() {
    this.paper.redraw()
    if (!this.paper._objectMap.has(this.text)) {
      this.paper.buffer.clear()
      this.text.draw(this.paper.turtle)
      this.paper.cursor.draw()
    }
  }

  paste(string) {
    this.paper.cursor.move(this.typingCursor)
    for (const c of string) {
      if (c === '\n') {
        this.text.insertNewline(this.paper.cursor.row, this.paper.cursor.col)
        this.paper.cursor.move({ row: this.paper.cursor.row + 1, col: this.text.col })
      } else {
        this.text.put(c, this.paper.cursor.row, this.paper.cursor.col)
        this.paper.cursor.move({ row: this.paper.cursor.row, col: this.paper.cursor.col + 1 })
      }
    }
    this.typingCursor = { row: this.paper.cursor.row, col: this.paper.cursor.col }
    this._redrawText()
  }

  cancel() {
    this.text = null
    this.finish()
  }

  finish() {
    const savedText = this.text
    this.text = null
    this.drawing = false
    this.insertMode = true
    if (savedText && !savedText.empty) this.paper.addObject(savedText)
    this.paper.buffer.clear()
    this.paper.redraw()
    this.paper.cursor.setMouse()
    if (savedText) this.paper.cursor.move({ row: savedText.row, col: savedText.col })
  }
}
