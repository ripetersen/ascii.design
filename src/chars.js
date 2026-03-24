export const NORTH = 0b1100
export const SOUTH = 0b0100
export const EAST  = 0b0001
export const WEST  = 0b0011

export const VERT  = NORTH | SOUTH // eslint-disable-line no-unused-vars
export const HORIZ = EAST | WEST   // eslint-disable-line no-unused-vars

export const LEFT  = 0 // eslint-disable-line no-unused-vars
export const RIGHT = 1 // eslint-disable-line no-unused-vars

export const LEFT_FROM = []
LEFT_FROM[NORTH] = WEST
LEFT_FROM[WEST]  = SOUTH
LEFT_FROM[SOUTH] = EAST
LEFT_FROM[EAST]  = NORTH

export const RIGHT_FROM = []
RIGHT_FROM[NORTH] = EAST
RIGHT_FROM[EAST]  = SOUTH
RIGHT_FROM[SOUTH] = WEST
RIGHT_FROM[EAST]  = NORTH

export const TURNS = new Map()
TURNS.set(NORTH, [WEST, EAST])
TURNS.set(SOUTH, [EAST, WEST])
TURNS.set(EAST,  [NORTH, SOUTH])
TURNS.set(WEST,  [SOUTH, NORTH])

export const ARROW_DIRECTION = new Map()
ARROW_DIRECTION.set('ArrowUp',    NORTH)
ARROW_DIRECTION.set('ArrowDown',  SOUTH)
ARROW_DIRECTION.set('ArrowLeft',  WEST)
ARROW_DIRECTION.set('ArrowRight', EAST)

export const CURSOR = new Map()
CURSOR.set(NORTH,                    '▴')
CURSOR.set(EAST,                     '▸')
CURSOR.set(SOUTH,                    '▾')
CURSOR.set(WEST,                     '◂')
CURSOR.set(NORTH|SOUTH|EAST|WEST,    '✥')

export const BOX = new Map()
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

export const ASCII = new Map()
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

export const ASCII_ROUND = new Map()
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

export const BLOCK = new Map()
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

// Connection bitmasks (separate from turtle direction encoding)
export const CN = 0b1000  // connects North
export const CS = 0b0100  // connects South
export const CE = 0b0010  // connects East
export const CW = 0b0001  // connects West

export const CHAR_CONNECTIONS = new Map([
  ['─', CE|CW],
  ['│', CN|CS],
  ['┌', CS|CE],
  ['┐', CS|CW],
  ['└', CN|CE],
  ['┘', CN|CW],
  ['├', CN|CS|CE],
  ['┤', CN|CS|CW],
  ['┬', CS|CE|CW],
  ['┴', CN|CE|CW],
  ['┼', CN|CS|CE|CW],
])

export const CONNECTIONS_CHAR = new Map([
  [CE|CW,       '─'],
  [CN|CS,       '│'],
  [CS|CE,       '┌'],
  [CS|CW,       '┐'],
  [CN|CE,       '└'],
  [CN|CW,       '┘'],
  [CN|CS|CE,    '├'],
  [CN|CS|CW,    '┤'],
  [CS|CE|CW,    '┬'],
  [CN|CE|CW,    '┴'],
  [CN|CS|CE|CW, '┼'],
])

// Re-verify a char that's already been written by checking which of its
// claimed connections are actually backed by neighboring characters.
// Used to fix endpoint chars after the full line is in the buffer.
export function verifyCharAt(getChar, row, col) {
  const char = getChar(row, col)
  if (!char || char === ' ') return char
  const nominal = CHAR_CONNECTIONS.get(char) ?? 0
  if (nominal === 0) return char
  let verified = 0
  if ((nominal & CN) && (CHAR_CONNECTIONS.get(getChar(row - 1, col)) ?? 0) & CS) verified |= CN
  if ((nominal & CS) && (CHAR_CONNECTIONS.get(getChar(row + 1, col)) ?? 0) & CN) verified |= CS
  if ((nominal & CE) && (CHAR_CONNECTIONS.get(getChar(row, col + 1)) ?? 0) & CW) verified |= CE
  if ((nominal & CW) && (CHAR_CONNECTIONS.get(getChar(row, col - 1)) ?? 0) & CE) verified |= CW
  if (verified === 0) return char
  return CONNECTIONS_CHAR.get(verified) ?? char
}

export function composeAtPosition(getChar, row, col, newChar) {
  const existing = getChar(row, col)
  if (!existing || existing === ' ') return newChar

  const nominal = CHAR_CONNECTIONS.get(existing) ?? 0
  if (nominal === 0) return newChar

  // Verify each connection by checking if the neighbor connects back
  let verified = 0
  if ((nominal & CN) && (CHAR_CONNECTIONS.get(getChar(row - 1, col)) ?? 0) & CS) verified |= CN
  if ((nominal & CS) && (CHAR_CONNECTIONS.get(getChar(row + 1, col)) ?? 0) & CN) verified |= CS
  if ((nominal & CE) && (CHAR_CONNECTIONS.get(getChar(row, col + 1)) ?? 0) & CW) verified |= CE
  if ((nominal & CW) && (CHAR_CONNECTIONS.get(getChar(row, col - 1)) ?? 0) & CE) verified |= CW

  const merged = verified | (CHAR_CONNECTIONS.get(newChar) ?? 0)
  return CONNECTIONS_CHAR.get(merged) ?? newChar
}
