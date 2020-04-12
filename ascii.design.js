"use strict"

let debug = false;

const NORTH = 0b1100
const SOUTH = 0b0100
const EAST  = 0b0001
const WEST  = 0b0011

const LEFT  = 0
const RIGHT = 1
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

const ERASE_CURSOR = new Map()
CURSOR.set(NORTH, '▴')
CURSOR.set(EAST , '▸')
CURSOR.set(SOUTH, '▾')
CURSOR.set(WEST , '◂')
//CURSOR.set(NORTH, '▲')
//CURSOR.set(EAST , '▶')
//CURSOR.set(SOUTH, '▼')
//CURSOR.set(WEST , '◀')

const BOX = new Map()
// Line
BOX.set(NORTH,                "│")
BOX.set(SOUTH,                "│")
BOX.set(EAST,                 "─")
BOX.set(WEST,                 "─")
// reverse
BOX.set(NORTH<<4 |  SOUTH,    "│")
BOX.set(WEST <<4 |  EAST,     "─")
BOX.set(SOUTH<<4 |  NORTH,    "│")
BOX.set(WEST <<4 |  EAST,     "─")

BOX.set(NORTH<<4 |  EAST,     "┌")
BOX.set(NORTH<<4 |  WEST,     "┐")

BOX.set(SOUTH<<4 |  EAST,     "└")
BOX.set(SOUTH<<4 |  WEST,     "┘")

BOX.set(WEST<<4  |  SOUTH,    "┌")
BOX.set(WEST<<4  |  NORTH,    "└")

BOX.set(EAST<<4  |  SOUTH,    "┐")
BOX.set(EAST<<4  |  NORTH,    "┘")

const ASCII = new Map()
ASCII.set(NORTH,              "|")
ASCII.set(SOUTH,              "|")
ASCII.set(EAST,               "-")
ASCII.set(WEST,               "-")
ASCII.set(NORTH<<4 |  EAST,   "+")
ASCII.set(WEST<<4  |  SOUTH,  "+")
ASCII.set(SOUTH<<4 |  EAST,   "+")
ASCII.set(WEST<<4  |  NORTH,  "+")
ASCII.set(EAST<<4  |  SOUTH,  "+")
ASCII.set(NORTH<<4 |  WEST,   "+")
ASCII.set(EAST<<4  |  NORTH,  "+")
ASCII.set(SOUTH<<4 |  WEST,   "+")

const ASCII_ROUND = new Map()
ASCII.set(NORTH,              "|")
ASCII.set(SOUTH,              "|")
ASCII.set(EAST,               "-")
ASCII.set(WEST,               "-")
ASCII.set(NORTH<<4 |  EAST,   "/")
ASCII.set(WEST<<4  |  SOUTH,  "/")
ASCII.set(SOUTH<<4 |  EAST,   "\\")
ASCII.set(WEST<<4  |  NORTH,  "\\")
ASCII.set(EAST<<4  |  SOUTH,  "\\")
ASCII.set(NORTH<<4 |  WEST,   "\\")
ASCII.set(EAST<<4  |  NORTH,  "/")
ASCII.set(SOUTH<<4 |  WEST,   "/")

const BLOCK = new Map()
BLOCK.set(NORTH,              "█")
BLOCK.set(SOUTH,              "█")
BLOCK.set(EAST,               "█")
BLOCK.set(WEST,               "█")
BLOCK.set(NORTH<<4 |  EAST,   "█")
BLOCK.set(WEST<<4  |  SOUTH,  "█")
BLOCK.set(SOUTH<<4 |  EAST,   "█")
BLOCK.set(WEST<<4  |  NORTH,  "█")
BLOCK.set(EAST<<4  |  SOUTH,  "█")
BLOCK.set(NORTH<<4 |  WEST,   "█")
BLOCK.set(EAST<<4  |  NORTH,  "█")
BLOCK.set(SOUTH<<4 |  WEST,   "█")

class Buffer {
    constructor(backgroundChar = ' ') {
        this.backgroundChar = backgroundChar
        this.rows = new Map()
        this.width = 0
        this.height = 0
    }

    clear() {
        this.rows.clear()
        this.width = 0
        this.height = 0
    }

    putchar(c, row, col) {
        if( !this.rows.has(row) ) {
            this.rows.set(row, new Map())
        }
        this.rows.get(row).set(col, c)
        this.height = Math.max(this.height, row+1)
        this.width = Math.max(this.width, col+1)
    }

    getchar(row, col) {
        return this.rows.has(row) && this.rows.get(row).has(col) ?
            this.rows.get(row).get(col) : this.backgroundChar 
    }

    haschar(row, col) {
        return this.rows.has(row) && this.rows.get(row).has(col) 
    }

    toString() {
        let s = ''
        for( let r = 0; r < this.height; r++ ) {
          for( let c = 0; c < this.width; c++ ) {
              s = s + this.getchar(r, c)
          }
          s = s + '\n'
        }
        return s
    }
}

class Turtle {
    constructor(paper) {
        this.paper = paper
        this.row = 0
        this.col = 0
        this.direction = EAST
        this.characterSet = BOX
    }

    putchar(c) {
        if( c ) this.paper.drawChar(c, this.row, this.col, this.style, this.backgroundStyle) 
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

    face(direction) { 
        this.putchar(this.characterSet.get(this.direction<<4 | direction))
        this.direction = direction
        this.step()
        return this
    }

    draw(length=1) {
        this.write(this.characterSet.get(this.direction).repeat(length))
        return this
    }

    turn(direction) {
        return this.face(TURNS.get(this.direction)[direction])
    }

    go(direction) {
        return this.direction == direction ? this.draw() : this.face(direction)
    }
}

class Text {
	constructor(text, row, col, style, backgroundStyle) {
		this.text = text;
		this.row = row;
		this.col = col;
		this.style = style;
		this.backgroundStyle = backgroundStyle;
	}

	draw() {
		drawChar(this.text, this.row, this.col, this.style, this.backgroundStyle);
	}
}

class LineDrawer {
	straightLine(row,col) {
		const tail = this.line.start.tail().previous;
		const deltaR = Math.abs(tail.row - row);
		const deltaC = Math.abs(tail.col - col);
		if (deltaR > deltaC) {
			col = tail.col;
		} else {
			row = tail.row;
		}
		return [row,col];
	}

	cursorClick(row, col) {
		if( this.line ) {
			[row,col] = this.straightLine(row,col);
			console.log(`new Point(${row},${col}`);
			this.line.start.tail().add(new Point(row,col));
		} else {
			console.log('start Line')
			this.line = new Line((new Point(row,col)).add(new Point(row,col)).head(),lineStyle.ascii);
		}
		this.line.draw();
	}

	cursorMove(row, col) {
		if( this.line ) {
			const tail = this.line.start.tail();
			[row,col] = this.straightLine(row,col);
			tail.row = row;
			tail.col = col;
			redraw();
			this.line.draw();
		}
	}
}

class BoxDrawer {
	cursorDown(row, col) {
		this.box = new Box(row,col,1,1,boxStyle.ascii);
		this.box.draw();
	}

	cursorMove(row, col) {
		if( this.box ) {
			this.box.height = 1 + row - this.box.row;
			this.box.width  = 1 + col - this.box.col;
			redraw();
			this.box.draw();
		}
	}

	cursorUp(row,col) {
		if( this.box ) {
			this.box.height = 1 + row - this.box.row;
			this.box.width  = 1 + col - this.box.col;
			redraw();
			this.box.draw();
			objects.push(this.box);
		}
		this.box = null;
	}
}

class PenTool {}
class TextTool {}
class LineTool {}
class Line {
    constructor(row0, col0, row1, col1) {
        row1 = row1 == undefined ? row0 : row1
        col1 = col1 == undefined ? col0 : col1
        this.row0 = row0
        this.col0 = col0
        this.row1 = row1
        this.col1 = col1
    }

    end(row, col) {
        this.row1 = row
        this.col1 = col
    }

    draw(turtle) {
        const upperRow = Math.min(this.row0, this.row1)
        const leftCol = Math.min(this.col0, this.col1)
        const height = Math.max(0, Math.abs(this.row1 - this.row0)-1)
        const width = Math.max(0, Math.abs(this.col1 - this.col0)-1)

        turtle.direction = EAST
        turtle.goto(upperRow, leftCol + 1)
            .draw(width).turn(RIGHT)
            .draw(height).turn(RIGHT)
            .draw(width).turn(RIGHT)
            .draw(height).turn(RIGHT)
    }
}

class BoxTool {
    constructor(paper) {
        this.paper = paper
    }
    cursorDown(e) { 
        this.box = new Box(e.row, e.col)
    }
    cursorUp(e) { 
        this.setCorner(e.row, e.col, e.ctrlKey)
        this.paper.objects.push(this.box)
        this.box = null
        this.paper.buffer.clear()
        this.paper.redraw()
    }
    cursorMove(e) { 
        if(this.box) {
            this.setCorner(e.row, e.col, e.ctrlKey)
            this.paper.redraw()
            this.paper.buffer.clear()
            this.box.draw(this.paper.turtle)
        }
    }

    setCorner(row, col, square) {
        if( square ) {
            const side = Math.min(
                Math.abs(row - this.box.row0),
                Math.abs(col - this.box.col0)
            )
            row = this.box.row0 + Math.sign(row - this.box.row0) * side
            col = this.box.col0 + Math.sign(col - this.box.col0) * side
        }
        this.box.end(row,col)
    }
}

class Box {
    constructor(row0, col0, row1, col1) {
        row1 = row1 == undefined ? row0 : row1
        col1 = col1 == undefined ? col0 : col1
        this.row0 = row0
        this.col0 = col0
        this.row1 = row1
        this.col1 = col1
    }

    end(row, col) {
        this.row1 = row
        this.col1 = col
    }

    draw(turtle) {
        const upperRow = Math.min(this.row0, this.row1)
        const leftCol = Math.min(this.col0, this.col1)
        const height = Math.max(0, Math.abs(this.row1 - this.row0)-1)
        const width = Math.max(0, Math.abs(this.col1 - this.col0)-1)
        turtle.direction = EAST
        turtle.goto(upperRow, leftCol + 1)
            .draw(width).turn(RIGHT)
            .draw(height).turn(RIGHT)
            .draw(width).turn(RIGHT)
            .draw(height).turn(RIGHT)
    }
}

class Cursor {
    constructor(paper) {
        this.paper = paper
        this.row = 0
        this.col = 0
        this.cursorChar = '*'
        this.cursorChar = '\u2588'
    }

    move(e) {
        if( this.row != e.row ||
            this.col != e.col) {
            this.paper.redrawCell(this.row, this.col)
            this.row = e.row
            this.col = e.col
            this.paper.cursorMove(e)
            this.paper.drawChar(this.cursorChar, this.row, this.col)
        }
    }


    keydown(e){
        e.row = this.row
        e.col = this.col
        switch( e.code ) {
            case 'ArrowUp':
                e.row -= 1
                break;
            case 'ArrowDown':
                e.row += 1
                break;
            case 'ArrowRight':
                e.col += 1
                break;
            case 'ArrowLeft':
                e.col -= 1
                break;
        }
        this.move(e)
    }
}

class Paper {
    constructor(canvas) {
        this.canvas = canvas
        this.padding = { x:0, y:0 }
        this.objects = []
        this.fontFamily = "Monospace"
        this.fontHeight = 40
        this.cursor = new Cursor(this)
        this.paperBuffer = new Buffer()
        this.toolBuffer = new Buffer()
        this.buffer = this.toolBuffer
        this.turtle = new Turtle(this)

        this.ctx = canvas.getContext('2d')

        canvas.addEventListener('mousemove', (e) => this.mouseMove(e))
        canvas.addEventListener('mouseout', (e) => this.mouseOut(e))
        canvas.addEventListener('click', (e) => this.click(e))
        canvas.addEventListener('mousedown', (e) => this.mouseDown(e))
        canvas.addEventListener('mouseup', (e) => this.mouseUp(e))
        canvas.addEventListener('touchstart', (e) => this.touchStart(e))
        canvas.addEventListener('touchend', (e) => this.touchEnd(e))
        canvas.addEventListener('touchmove', (e) => this.touchMove(e))
        document.addEventListener("keydown", (e) => this.keydown(e)) 
        window.addEventListener('resize', (e) => this.resizeCanvas(e))

        this.resizeCanvas()
    }

    setEventHandler(eventHandler) {
        this.eventHandler = eventHandler 
        this.toolBuffer.clear()
    }

    updateEvent(e) {
        e.preventDefault()
        let rect = this.canvas.getBoundingClientRect()
        let x = (e.clientX - rect.left)*window.devicePixelRatio
        let y = (e.clientY - rect.top )*window.devicePixelRatio
        e.col = this.x2col(x)
        e.row = this.y2row(y)
    }

    col2x(col) {
        return (this.charSize.width+2*this.padding.x)*col+this.padding.x+1
    }

    x2col(x) {
        return Math.floor((x-1-this.padding.x)/(this.charSize.width+2*this.padding.x))
    }

    row2y(row) {
        return (this.charSize.height+2*this.padding.y)*row+this.padding.y+1
    }

    y2row(y) {
        return Math.floor((y-1-this.padding.y)/(this.charSize.height+2*this.padding.y))
    }

    keydown(e) {
        e.preventDefault()
        this.cursor.keydown(e)
        if( this.eventHandler && this.eventHandler.keydown ) {
            this.eventHandler.keydown(e)
        }
    }
    cursorMove(e) {
        if( this.eventHandler && this.eventHandler.cursorMove ) {
            this.eventHandler.cursorMove(e)
        }
    }

    cursorDown(e) {
        if( this.eventHandler && this.eventHandler.cursorDown ) {
            this.eventHandler.cursorDown(e)
        }
    }

    cursorUp(e) {
        if( this.eventHandler && this.eventHandler.cursorUp ) {
            this.eventHandler.cursorUp(e)
        }
    }

    cursorClick(e) {
        if( this.eventHandler && this.eventHandler.cursorClick ) {
            this.eventHandler.cursorClick(e)
        }
    }

    mouseOut(e) {
        // this.cursor.move(-1, -1)
    }

    mouseMove(e) {
        this.updateEvent(e)
        this.cursor.move(e)
    }

    touchMove(e) {
        this.updateEvent(e) 
        this.cursor.move(e)
    }

    mouseDown(e) {
        this.updateEvent(e) 
        this.cursorDown(e)
    }

    mouseUp(e) {
        this.updateEvent(e) 
        this.cursorUp(e)
    }

    click(e) {
        this.updateEvent(e) 
        this.cursorClick(e)
    }

    touchStart(e) {
        this.updateEvent(e) 
        this.cursorDown(e)
    }

    touchEnd(e) {
        this.updateEvent(e) 
        this.cursorUp(e)
    }

    calculateCharacterSize() {
        let bufferCanvas = this.canvas
        if( !debug ) {
            bufferCanvas = document.createElement("canvas")
            bufferCanvas.width = 3*this.fontHeight
            bufferCanvas.height = 3*this.fontHeight
        }
        const bufferContext = bufferCanvas.getContext('2d')

        bufferContext.font = this.fontHeight+'px '+this.fontFamily
        console.log(`font = ${bufferContext.font}`)
        bufferContext.fillStyle = 'red'
        bufferContext.textBaseline = 'top'

        const width = Math.ceil(bufferContext.measureText('\u2588').width)
        console.log(`width = ${width}`)
        console.log(`top = ${this.fontHeight}`)
        bufferContext.fillText('\u2588', 0, this.fontHeight)
        //bufferContext.fillRect(0,fontHeight,width,fontHeight)

        let imageData = bufferContext.getImageData(Math.floor(width/2), 0, 1, this.fontHeight*3)
        let boundingTop = -1
        let boundingBottom = -1

        for(let n=0; n<this.fontHeight*3*4; n+=4) {
            if(imageData.data[n]!=0) {
                boundingTop = n/4
                console.log(`n = ${n}`)
                break
            }
        }
        console.log(`boundingTop = ${boundingTop}`)

        console.log(`n = ${4*(boundingTop+1)}`)
        for(let n=4*(boundingTop+1); n<this.fontHeight*3*4; n+=4) {
            if(imageData.data[n]==0) {
                boundingBottom = n/4
                break
            }
        }
        console.log(`boundingBottom = ${boundingBottom}`)
        const height = boundingBottom - boundingTop

        this.charSize = {
            height: height,
            width: width,
            leading: this.fontHeight - boundingTop 
        }
        console.log(this.charSize)
    }

    drawGrid() {
        this.ctx.beginPath()
        for(let x=1; x<this.canvas.width;  x += (2*this.padding.x + this.charSize.width)) {
            this.ctx.moveTo(x,1)
            this.ctx.lineTo(x,this.canvas.height)
        }
        for(let y=1; y<this.canvas.height; y += (2*this.padding.y + this.charSize.height)) {
            this.ctx.moveTo(1,y)
            this.ctx.lineTo(this.canvas.width, y)
        }
        this.ctx.strokeStyle = '#ccffff'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
    }

    clearCell(row, col) {
        const x = this.col2x(col)
        const y = this.row2y(row)
        this.ctx.fillStyle = 'white'
        this.ctx.fillRect(x, y, this.charSize.width, this.charSize.height)
        this.ctx.strokeStyle = '#ccffff'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(x, y, this.charSize.width, this.charSize.height)
    }

    redrawCell(row, col) {
        if( this.paperBuffer.haschar(row, col) ) {
            this.drawChar(this.paperBuffer.getchar(row, col), row, col)
        } else {
            this.clearCell(this.clearCell(row, col))
        }
    }

    drawChar(c, row, col, style, backgroundStyle) {
        this.buffer.putchar(c, row, col)
        const x = this.col2x(col)
        const y = this.row2y(row)
        this.ctx.fillStyle = backgroundStyle || 'white'
        this.ctx.fillRect(x, y, this.charSize.width, this.charSize.height)
        this.ctx.font = this.fontHeight+'px '+this.fontFamily
        this.ctx.textBaseline = 'top'
        this.ctx.fillStyle = style || 'black'
        this.ctx.fillText(c, x, y + this.charSize.leading)
    }

    drawObjects() {
        this.buffer = this.paperBuffer
        this.buffer.clear()
        for( let object of this.objects ) {
            object.draw(this.turtle)
        }
        this.buffer = this.toolBuffer
    }

    resizeCanvas(e) {
        const dpi = window.devicePixelRatio
        const height = window.innerHeight
        this.canvas.style.height = height+'px'
        this.canvas.height=height*dpi
        const width = window.innerWidth
        this.canvas.style.width = width+'px'
        this.canvas.width=width*dpi
        this.calculateCharacterSize()
        this.redraw()
    }

    redraw() {
        this.canvas.width = this.canvas.width
        this.drawGrid()
        this.drawObjects()
    }
}

const tools = new Map()
class Toolbox {
    constructor(icons, paper) {
        this.icons = icons
        this.paper = paper
        this.tools = new Map()
        icons.forEach( i => {
            i.addEventListener('click', (e) => this.iconClick(e))
            const tool = i.dataset.tool
            const toolClass = eval(tool)
            this.tools.set(tool, new toolClass(paper))
        })
        this.iconClick( {target: icons[0]})
    }

    iconClick(e) {
        this.icons.forEach( i => i.classList.remove('selected') )
        e.target.classList.add('selected')
        this.paper.eventHandler = this.tools.get( e.target.dataset.tool )
    }

    startTool(row, col) {
        console.log(this.selectedTool)
    }

    endTool() {
    }
}

let paper, cursor, toolbox
const lineEventHandler = new LineDrawer()
const boxEventHandler = new BoxDrawer()
const logEventHandler = {
	cursorDown:  (row,col) => console.log(`cursorDown(${row},${col})`),
	cursorUp:    (row,col) => console.log(`cursorUp(${row},${col})`),
	cursorClick: (row,col) => console.log(`cursorClick(${row},${col})`),
	cursorMove:  (row,col) => console.log(`cursorMove(${row},${col})`)
}

function init() {
    paper = new Paper(document.getElementById('canvas'))
    toolbox = new Toolbox(document.querySelectorAll('.menu .icon'), paper)
    cursor = new Cursor(paper, toolbox)
    //paper.setEventHandler(cursor)
    //paper.eventHandler = logEventHandler
}

window.addEventListener('DOMContentLoaded',init)
