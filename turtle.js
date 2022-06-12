const NORTH = 0b1100
const SOUTH = 0b0100
const EAST  = 0b0001
const WEST  = 0b0011

const DIRECTION=[]
DIRECTION[NORTH]="NORTH"
DIRECTION[SOUTH]="SOUTH"
DIRECTION[EAST]="EAST"
DIRECTION[WEST]="WEST"

const LEFT_FROM=[]
LEFT_FROM[NORTH]=WEST
LEFT_FROM[WEST]=SOUTH
LEFT_FROM[SOUTH]=EAST
LEFT_FROM[EAST]=NORTH

const RIGHT_FROM=[]
RIGHT_FROM[NORTH]=EAST
RIGHT_FROM[EAST]=SOUTH
RIGHT_FROM[SOUTH]=WEST
RIGHT_FROM[EAST]=NORTH

const VERT  = NORTH | SOUTH // eslint-disable-line no-unused-vars
const HORIZ  = EAST | WEST // eslint-disable-line no-unused-vars

const LEFT  = 0 // eslint-disable-line no-unused-vars
const RIGHT = 1 // eslint-disable-line no-unused-vars

const TURNS = new Map()
TURNS.set(NORTH, [WEST, EAST])
TURNS.set(SOUTH, [EAST, WEST])
TURNS.set(EAST , [NORTH, SOUTH])
TURNS.set(WEST , [SOUTH, NORTH])

const ARROW_DIRECTION = new Map()
ARROW_DIRECTION.set('ArrowUp', NORTH)
ARROW_DIRECTION.set('ArrowDown', SOUTH)
ARROW_DIRECTION.set('ArrowLeft', WEST)
ARROW_DIRECTION.set('ArrowRight', EAST)

const CURSOR = new Map()
CURSOR.set(NORTH, '▴')
CURSOR.set(EAST , '▸')
CURSOR.set(SOUTH, '▾')
CURSOR.set(WEST , '◂')
CURSOR.set(NORTH|SOUTH|EAST|WEST,'✥')

const BOX = new Map()
BOX.set(NORTH,             "│")
BOX.set(SOUTH,             "│")
BOX.set(EAST,              "─")
BOX.set(WEST,              "─")
BOX.set(NORTH<<4 |  SOUTH, "│")
BOX.set(NORTH<<4 |  NORTH, "│")
BOX.set(NORTH<<4 |  EAST,  "┌")
BOX.set(NORTH<<4 |  WEST,  "┐")
BOX.set(WEST <<4 |  WEST,  "─")
BOX.set(WEST <<4 |  EAST,  "─")
BOX.set(WEST <<4 |  SOUTH, "┌")
BOX.set(WEST <<4 |  NORTH, "└")
BOX.set(SOUTH<<4 |  NORTH, "│")
BOX.set(SOUTH<<4 |  SOUTH, "│")
BOX.set(SOUTH<<4 |  EAST,  "└")
BOX.set(SOUTH<<4 |  WEST,  "┘")
BOX.set(EAST <<4 |  WEST,  "─")
BOX.set(EAST <<4 |  EAST,  "─")
BOX.set(EAST<<4  |  SOUTH, "┐")
BOX.set(EAST<<4  |  NORTH, "┘")

const ASCII = new Map()
ASCII.set(NORTH,             "|")
ASCII.set(SOUTH,             "|")
ASCII.set(EAST,              "-")
ASCII.set(WEST,              "-")
ASCII.set(NORTH<<4 |  EAST,  "+")
ASCII.set(NORTH<<4 |  WEST,  "+")
ASCII.set(NORTH<<4 |  SOUTH, "|")
ASCII.set(NORTH<<4 |  NORTH, "|")
ASCII.set(WEST<<4  |  SOUTH, "+")
ASCII.set(WEST<<4  |  NORTH, "+")
ASCII.set(WEST<<4  |  WEST,  "-")
ASCII.set(WEST<<4  |  EAST,  "-")
ASCII.set(EAST<<4  |  SOUTH, "+")
ASCII.set(EAST<<4  |  NORTH, "+")
ASCII.set(EAST<<4  |  EAST,  "-")
ASCII.set(EAST<<4  |  WEST,  "-")
ASCII.set(SOUTH<<4 |  WEST,  "+")
ASCII.set(SOUTH<<4 |  EAST,  "+")
ASCII.set(SOUTH<<4 |  SOUTH, "|")
ASCII.set(SOUTH<<4 |  NORTH, "|")

const ASCII_ROUND = new Map()
ASCII_ROUND.set(NORTH,        "|")
ASCII_ROUND.set(SOUTH,        "|")
ASCII_ROUND.set(EAST,         "-")
ASCII_ROUND.set(WEST,         "-")
ASCII_ROUND.set(NORTH<<4 |  EAST,  "/" )
ASCII_ROUND.set(NORTH<<4 |  WEST,  "\\")
ASCII_ROUND.set(NORTH<<4 |  SOUTH, "|" )
ASCII_ROUND.set(NORTH<<4 |  NORTH, "|" )
ASCII_ROUND.set(WEST<<4  |  NORTH, "\\")
ASCII_ROUND.set(WEST<<4  |  SOUTH, "/" )
ASCII_ROUND.set(WEST<<4  |  WEST,  "-" )
ASCII_ROUND.set(WEST<<4  |  EAST,  "-" )
ASCII_ROUND.set(EAST<<4  |  SOUTH, "\\")
ASCII_ROUND.set(EAST<<4  |  NORTH, "/" )
ASCII_ROUND.set(EAST<<4  |  WEST,  "-" )
ASCII_ROUND.set(EAST<<4  |  EAST,  "-" )
ASCII_ROUND.set(SOUTH<<4 |  WEST,  "/" )
ASCII_ROUND.set(SOUTH<<4 |  EAST,  "\\")
ASCII_ROUND.set(SOUTH<<4 |  SOUTH, "|" )
ASCII_ROUND.set(SOUTH<<4 |  NORTH, "|" )

const BLOCK = new Map()
BLOCK.set(NORTH,             "█")
BLOCK.set(SOUTH,             "█")
BLOCK.set(EAST,              "█")
BLOCK.set(WEST,              "█")
BLOCK.set(NORTH<<4 |  EAST,  "█")
BLOCK.set(NORTH<<4 |  WEST,  "█")
BLOCK.set(NORTH<<4 |  NORTH, "█")
BLOCK.set(NORTH<<4 |  SOUTH, "█")
BLOCK.set(WEST<<4  |  NORTH, "█")
BLOCK.set(WEST<<4  |  SOUTH, "█")
BLOCK.set(WEST<<4  |  EAST,  "█")
BLOCK.set(WEST<<4  |  WEST,  "█")
BLOCK.set(EAST<<4  |  SOUTH, "█")
BLOCK.set(EAST<<4  |  NORTH, "█")
BLOCK.set(EAST<<4  |  EAST,  "█")
BLOCK.set(EAST<<4  |  WEST,  "█")
BLOCK.set(SOUTH<<4 |  WEST,  "█")
BLOCK.set(SOUTH<<4 |  EAST,  "█")
BLOCK.set(SOUTH<<4 |  NORTH, "█")
BLOCK.set(SOUTH<<4 |  SOUTH, "█")

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
    if( c ) this.paper.drawChar(c, this.row, this.col, this.style, this.backgroundStyle)
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
}

