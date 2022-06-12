/* eslint-disable-next-line no-unused-vars */
import {SelectTool} from './select.js'
/* eslint-disable-next-line no-unused-vars */
import {BoxTool} from './box.js'
/* eslint-disable-next-line no-unused-vars */
import {LineTool} from './line.js'
/* eslint-disable-next-line no-unused-vars */
import {PenTool} from './pen.js'
/* eslint-disable-next-line no-unused-vars */
import {TextTool} from './text.js'

export class Toolbox {
  constructor(icons, paper) {
    this.icons = icons
    this.paper = paper
    this.tools = new Map()
    this.shortcuts = new Map()
    const toolbox = this
    icons.forEach( i => {
      i.addEventListener('click', (e) => toolbox.iconClick(e))
      const toolName = i.dataset.tool
      const toolClass = eval(toolName)
      const tool = new toolClass(paper)
      this.tools.set(toolName, tool)
      this.shortcuts.set(toolName.substring(0,1).toLowerCase(), toolName)
    })
    this.iconClick( {target: icons[0]})
  }

  iconClick(e) {
    this.startTool(e.target.dataset.tool)
  }


  edit(o, e) {
    var editor = Array.from(this.tools.values())
      .filter(tool => {
        return tool.constructor.produces
          && (o instanceof tool.constructor.produces)
      })[0]
    if(!editor) return console.log("No editor for ",o)
    this.startTool(editor.constructor.name)
    editor.edit(o, e)
  }
  selectTool(shortcut) {
    console.log(`'${shortcut}'`)
    this.startTool(this.shortcuts.get(shortcut))
  }

  startTool(toolName) {
    this.icons.forEach( i => {
      if( toolName == i.dataset.tool ) {
        i.classList.add('selected')
      } else {
        i.classList.remove('selected')
      }
    })
    if( this.selectedTool ) {
      this.selectedTool.finish()
    }
    this.selectedTool = this.tools.get(toolName)
    this.paper.setEventHandler(this.selectedTool)
    console.log("selected tool", this.selectedTool)
  }
}
