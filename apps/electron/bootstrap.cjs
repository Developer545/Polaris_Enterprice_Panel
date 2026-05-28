const path = require('path')
const Module = require('module')

const modulePaths = [
  path.join(process.resourcesPath || __dirname, 'local', 'node_modules'),
  path.join(__dirname, 'node_modules'),
  process.env.NODE_PATH,
].filter(Boolean)

process.env.NODE_PATH = modulePaths.join(path.delimiter)
Module._initPaths()

require('./dist/main/index.js')
