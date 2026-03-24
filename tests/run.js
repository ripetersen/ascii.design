'use strict'
// Run each test file sequentially so they don't compete for port 8889.
const { spawnSync } = require('child_process')

const files = [
  'tests/tools.test.js',
  'tests/box.test.js',
  'tests/line.test.js',
  'tests/persistence.test.js',
  'tests/select.test.js',
  'tests/text.test.js',
  'tests/text_enter.test.js',
  'tests/group.test.js',
  'tests/copy.test.js',
]

let anyFailed = false
for (const file of files) {
  const result = spawnSync('node', ['--test', file], { stdio: 'inherit' })
  if (result.status !== 0) anyFailed = true
}
process.exit(anyFailed ? 1 : 0)
