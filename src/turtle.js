import { NORTH, SOUTH, EAST, WEST,
         LEFT_FROM, RIGHT_FROM,
         BOX, ASCII, ASCII_ROUND, BLOCK,
         composeAtPosition, verifyCharAt } from './chars.js'

class Trip {
  constructor(turtle) {
    this.turtle = turtle
    this.reset()
  }

  get width() { return this.max.col - this.min.col + 1 }
  get height() { return this.max.row - this.min.row + 1 }

  update(row, col) {
    this.trip.max.col = Math.max(this.trip.max.col,col)
    this.trip.min.col = Math.min(this.trip.min.col,col)
    this.distance += Math.abs(this._col-col)
    this.trip.max.row = Math.max(this.trip.max.row,row)
    this.trip.min.row = Math.min(this.trip.min.row,row)
    this.distance += Math.abs(this._row-row)
  }

  reset() {
    this.start = {row: this.turtle.row, col: this.turtle.col}
    this.end = {row: this.turtle.row, col: this.turtle.col}
    this.max = {row: this.turtle.row, col: this.turtle.col}
    this.min = {row: this.turtle.row, col: this.turtle.col}
    this.distance = 0
  }
}

export class Turtle {
  constructor(paper) {
    this.paper = paper
    this._row = 0
    this._col = 0
    this._direction = EAST
    this.lastDirection = EAST
    this.characterSet = BOX
    this.trip = new Trip(this)
    this.compose = false
  }

  get row() { return this._row}
  set row(row) {
    this.trip.max.row = Math.max(this.trip.max.row,row)
    this.trip.min.row = Math.min(this.trip.min.row,row)
    this.distance += Math.abs(this._row-row)
    this._row = row
  }

  get col() { return this._col}
  set col(col) {
    this.trip.max.col = Math.max(this.trip.max.col,col)
    this.trip.min.col = Math.min(this.trip.min.col,col)
    this.distance += Math.abs(this._col-col)
    this._col = col
  }

  get direction() { return this._direction}
  set direction(d) {
    if(
      (NORTH & d) == NORTH ||
      (SOUTH & d) == SOUTH ||
      (EAST  & d) == EAST  ||
      (WEST  & d) == WEST
    ) {
      this.lastDirection = this._direction
      this._direction = d
      return
    }
    throw new Error(`invalid direction : ${d}`)
  }

  putchar(c) {
    if (c) {
      let char = c
      if (this.compose) {
        const buf = this.paper.buffer
        const paper = this.paper.paperBuffer
        const getChar = (r, col) => {
          if (buf.has(r, col)) return buf.get(r, col)
          if (paper.has(r, col)) return paper.get(r, col)
          return null
        }
        char = composeAtPosition(getChar, this.row, this.col, c)
      }
      this.paper.drawChar(char, this.row, this.col, this.style, this.backgroundStyle)
    }
    return this
  }

  write(s) {
    for( let c of s ) {
      this.putchar(c)
      this.step()
    }
    return this
  }

  step(steps=1) {
    let d = this.direction >> 2
    let vertical_step = (0b1 & d) * ((0b10 & d)*-1 + 1)

    d = this.direction & 0b11
    let horizontal_step = (0b1 & d) * ((0b10 & d)*-1 + 1)

    return this.goto(this.row + steps * vertical_step, this.col + steps * horizontal_step)
  }

  goto(row, col) {
    this.row = row
    this.col = col
    return this
  }

  // Changes the turtle's direction to be
  // face a point
  face(row, col) {
    const length = col - this.col
    const height = row - this.row

    if(Math.abs(length) > Math.abs(height)) {
      if(length > 0) {
        this.direction = EAST
      } else {
        this.direction = WEST
      }
    } else {
      if(height > 0) {
        this.direction = SOUTH
      } else {
        this.direction = NORTH
      }
    }
    return this
  }

  calculateDirection(row, col) {
    const length = col - this.col
    const height = row - this.row

    return Math.abs(length)>Math.abs(height)
      ? (length>0 ? EAST : WEST)
      : (height>0 ? SOUTH : NORTH)
  }

  left() {
    return this.turn(LEFT_FROM[this.direction])
  }

  right() {
    return this.turn(RIGHT_FROM[this.direction])
  }

  turn(direction) {
    // LEFT/RIGHT to cardinal direction
    // const new_direction = TURNS.get(this.direction)[direction]
    this.putchar(this.characterSet.get(this.direction<<4 | direction))
    this.direction = direction
    this.step()
    return this
  }

  draw(length=1) {
    if(length==0) return this
    const reverse = length < 0
    if( reverse ) {
      length = -length
      this.direction = (this.direction | (this.direction & 0b0101)<<1) & (this.direction ^ 0b1010)
    }
    this.write(this.characterSet.get(this.direction).repeat(length))
    if( reverse ) {
      this.direction = (this.direction | (this.direction & 0b0101)<<1) & (this.direction ^ 0b1010)
    }
    return this
  }

  drawTo(row, col) {
    const distance = Math.max(Math.abs(col-this.col), Math.abs(row-this.row))
    const direction = this.calculateDirection(row, col)

    if(distance==0) return
    return this
      .turn(direction)
      .draw(distance-1)
  }

  go(direction) {
    return this.direction == direction ? this.draw() : this.face(direction)
  }

  // After a line segment is fully drawn, re-verify the endpoint char against
  // its now-complete neighbors to eliminate phantom connections (e.g. ┼ → ┬
  // when the line terminates rather than passes through).
  verifyEndpoint(row, col) {
    const buf = this.paper.buffer
    const paper = this.paper.paperBuffer
    const getChar = (r, c) => {
      if (buf.has(r, c)) return buf.get(r, c)
      if (paper.has(r, c)) return paper.get(r, c)
      return null
    }
    const fixed = verifyCharAt(getChar, row, col)
    if (fixed && fixed !== getChar(row, col)) {
      this.paper.drawChar(fixed, row, col, this.style, this.backgroundStyle)
    }
  }
}

// Re-export character sets for consumers that import them from turtle.js
export { BOX, ASCII, ASCII_ROUND, BLOCK }
