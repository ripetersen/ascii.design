export class Buffer {
  constructor(backgroundChar = ' ') {
    this.backgroundChar = backgroundChar
    this.rows = new Map()
    this.minRow = Number.MAX_SAFE_INTEGER
    this.maxRow = Number.MIN_SAFE_INTEGER
    this.minCol = Number.MAX_SAFE_INTEGER
    this.maxCol = Number.MIN_SAFE_INTEGER
    this.width = 0
    this.height = 0
  }

  clear() {
    this.rows.clear()
    this.minRow = Number.MAX_SAFE_INTEGER
    this.maxRow = Number.MIN_SAFE_INTEGER
    this.minCol = Number.MAX_SAFE_INTEGER
    this.maxCol = Number.MIN_SAFE_INTEGER
    this.width = 0
    this.height = 0
  }

  put(o, row, col) {
    if( !this.rows.has(row) ) {
      this.rows.set(row, new Map())
    }
    this.rows.get(row).set(col, o)
    this.minRow = Math.min(this.minRow, row)
    this.maxRow = Math.max(this.maxRow, row)
    this.minCol = Math.min(this.minCol, col)
    this.maxCol = Math.max(this.maxCol, col)
    this.height = this.maxRow - this.minRow + 1
    this.width = this.maxCol - this.minCol + 1
  }

  delete(row, col) {
    if( this.rows.has(row) ) {
      if( this.rows.get(row).has(col) ) {
        this.rows.get(row).delete(col)
        if( this.rows.get(row).size == 0 ) {
          this.rows.delete(row)
        }
      }
    }
  }

  get(row, col) {
    return this.rows.has(row) && this.rows.get(row).has(col) ?
      this.rows.get(row).get(col) : this.backgroundChar
  }

  has(row, col) {
    return this.rows.has(row) && this.rows.get(row).has(col)
  }

  toString() {
    let s = ''
    for( let r = this.minRow; r <= this.maxRow; r++) {
      for( let c = this.minCol; c <= this.maxCol; c++) {
        s = s + this.get(r, c)
      }
      s = s + '\n'
    }
    return s
  }
}

export class NullBuffer {
  clear() {}
  put() {}
  get() {return null}
  has() {return false}
  toString() {return ''}
}
