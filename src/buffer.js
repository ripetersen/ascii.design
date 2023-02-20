export class Buffer {
  constructor(backgroundChar = ' ') {
    this.backgroundChar = backgroundChar
    this.rows = new Map()
    this.clear()
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
  calcMinMax() {
    this.maxRow = Math.max(...Array.from(this.rows.keys()))
    this.minRow = Math.min(...Array.from(this.rows.keys()))
    this.maxCol = Math.max(...Array.from(this.rows.values()).map(cols => Math.max(...Array.from(cols.keys()))))
    this.minCol = Math.min(...Array.from(this.rows.values()).map(cols => Math.min(...Array.from(cols.keys()))))
    this.height = this.maxRow - this.minRow + 1
    this.width = this.maxCol - this.minCol + 1
  }

  put(o, row, col) {
    if( !this.rows.has(row) ) {
      this.rows.set(row, new Map())
    }
    this.rows.get(row).set(col, o)
    this.calcMinMax()
  }

  delete(row, col) {
    if( this.rows.has(row) ) {
      if( this.rows.get(row).has(col) ) {
        this.rows.get(row).delete(col)
        if( this.rows.get(row).size == 0 ) {
          this.rows.delete(row)
        }
      }
      this.calcMinMax()
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
