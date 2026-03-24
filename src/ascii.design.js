import {Paper} from './paper.js'
import {Toolbox} from './toolbox.js'
import {Box} from './box.js'
import {Line} from './line.js'
import {Text} from './text.js'
import {PenLine} from './pen.js'
import {Group} from './group.js'

export var paper
export var toolbox

function update_location(e) {
    const X = e.detail.row.toString().padStart(3,' ')
    const Y = e.detail.col.toString().padStart(3,' ')
    document.getElementById('position').innerText = `(${X},${Y})`
}

function deserialize(data) {
  switch (data.type) {
    case 'Box': {
      const o = new Box(data.row, data.col)
      o.width = data.width; o.height = data.height
      return o
    }
    case 'Line': {
      const o = new Line(data.row, data.col)
      o.points = data.points.map(p => ({ row: p.row, col: p.col }))
      return o
    }
    case 'Text': {
      const o = new Text(data.row, data.col)
      if (data.lines) {
        o.lines = data.lines
      } else if (data.chars) {
        data.chars.forEach(([r, c, ch]) => o.put(ch, data.row + r, data.col + c))
      }
      return o
    }
    case 'PenLine': {
      const o = new PenLine(data.row, data.col)
      if (data.lines) {
        o.lines = data.lines
      } else if (data.chars) {
        data.chars.forEach(([r, c, ch]) => o.put(ch, data.row + r, data.col + c))
      }
      return o
    }
    case 'Group': {
      const children = data.children.map(deserialize).filter(Boolean)
      return new Group(children)
    }
    default:
      return null
  }
}

function loadFromStorage(paper) {
  try {
    const raw = localStorage.getItem('ascii-design-state')
    if (!raw) return
    const state = JSON.parse(raw)
    if (state.fontHeight) {
      paper.fontHeight = state.fontHeight
      paper.calculateCharacterSize()
      paper._updateZoomDisplay()
    }
    if (state.panX !== undefined) paper._panX = state.panX
    if (state.panY !== undefined) paper._panY = state.panY
    const objects = state.objects.map(deserialize).filter(Boolean)
    paper.addObject(...objects)
    paper.redraw()
  } catch (err) {
    console.warn('Failed to restore state:', err)
    localStorage.removeItem('ascii-design-state')
  }
}

export function init() {
  paper = new Paper(document.getElementById('canvas'))
  paper.cursor.addEventListener('change', update_location)
  toolbox = new Toolbox(document.querySelectorAll('.menu .icon'), paper)
  paper.toolbox = toolbox

  loadFromStorage(paper)

  document.querySelector('[data-action="clear"]').addEventListener('click', () => {
    if (confirm('Clear the entire canvas? This cannot be undone.')) {
      paper.deleteObject(...paper.allObjects())
      localStorage.removeItem('ascii-design-state')
      paper.redraw()
    }
  })
}

// window.addEventListener('DOMContentLoaded',init)
