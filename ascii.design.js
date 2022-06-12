import {Paper} from './paper.js'
import {Toolbox} from './toolbox.js'

export var paper
export var toolbox
export function init() {
  paper = new Paper(document.getElementById('canvas'))
  paper.cursor.addEventListener('change', e => {
    document.getElementById('position').innerText = `(${e.detail.row.toString().padStart(3,' ')},${e.detail.col.toString().padStart(3,' ')})`
  })
  toolbox = new Toolbox(document.querySelectorAll('.menu .icon'), paper)
  paper.toolbox = toolbox
}

window.addEventListener('DOMContentLoaded',init)
