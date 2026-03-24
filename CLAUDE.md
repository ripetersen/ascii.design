# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ascii.design** is a browser-based ASCII art drawing tool. It renders to an HTML5 `<canvas>` element using a monospace font grid, and lets users draw boxes, lines, freehand paths, and text using Unicode box-drawing characters.

## Running the App

```bash
npm start          # serves ./src/ on http://localhost:8000 via Python HTTP server
./start_server.sh  # same, but auto-detects python vs python3
```

No build step is required — the app uses native ES modules loaded directly by the browser.

## Architecture

All source lives in `src/`. The app is loaded via `index.html`, which dynamically imports `ascii.design.js` on `DOMContentLoaded`.

**Core objects:**

- **`Paper`** (`paper.js`) — The central controller. Owns the `<canvas>`, handles all DOM events (mouse, touch, keyboard), translates pixel coordinates to grid `(row, col)`, and manages the list of `DrawObject` instances. It delegates events to the currently active tool via `setEventHandler(tool)`.

- **`Turtle`** (`turtle.js`) — A turtle-graphics renderer. Tools call turtle methods (`goto`, `draw`, `drawTo`, `turn`) to paint characters onto the canvas. The turtle uses character-set maps (`BOX`, `ASCII`, `ASCII_ROUND`, `BLOCK`) keyed by directional bitmasks to pick the correct line-drawing character at each position/turn.

- **`Buffer`** (`buffer.js`) — A sparse `Map<row, Map<col, char>>` representing characters on a layer. `Paper` maintains two buffers: `paperBuffer` (committed objects) and `toolBuffer` (in-progress drawing preview). A `NullBuffer` is used for cursor rendering.

- **`Toolbox`** (`toolbox.js`) — Manages the toolbar icons. Instantiates one instance of each tool class (via `eval(toolName)` from `data-tool` attributes), wires icon clicks, and handles `Ctrl+<key>` shortcuts to switch tools.

**Tool classes** (all extend `AbstractTool` from `abstractTool.js`):

| File | Tool class | DrawObject |
|------|-----------|------------|
| `box.js` | `BoxTool` | `Box` |
| `line.js` | `LineTool` | `Line` |
| `pen.js` | `PenTool` | `Pen` |
| `text.js` | `TextTool` | `Text` |
| `select.js` | `SelectTool` | — |

Each tool implements some subset of `cursorMove`, `cursorDown`, `cursorUp`, `cursorClick`, `cursorDoubleClick`, `keydown`, `finish`, and `cancel` from `AbstractTool`. Tools also declare a static `produces` property (the `DrawObject` subclass they create) so `Toolbox.edit()` can dispatch double-click editing to the correct tool.

**`DrawObject`** (defined in `abstractTool.js`) — Base class for all drawable shapes. Stores `row`, `col`, `width`, `height`, and `selected`. Provides `contains(row, col)` for hit-testing and `draw(turtle)` for rendering.

**Coordinate system:** The canvas uses `(row, col)` with row=0 at top. `Paper` maps pixel coordinates to grid cells using `charSize` (measured at runtime by rendering a block character to a temporary canvas).

## Adding a New Tool

1. Create `src/mytool.js` exporting `MyTool extends AbstractTool` with a static `produces` property pointing to your `DrawObject` subclass.
2. Add a toolbar icon in `index.html` with `data-tool="MyTool"`.
3. Add an SVG icon file and an `import` in `toolbox.js` (marked `eslint-disable-next-line no-unused-vars` — the class is accessed via `eval`).

## Linting

```bash
npx eslint src/
```

ESLint is configured via `.eslintrc` (if present) using `@babel/eslint-parser`. The codebase uses `/* eslint-disable-next-line no-unused-vars */` annotations on tool imports in `toolbox.js` because those classes are referenced via `eval`.
