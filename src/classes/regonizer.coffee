{EventEmitter} = require 'events'

module.exports =
class Regonizer extends EventEmitter
  constructor: ()->
    @lineseparator = "\n"
  setLineSeparator: (sep)->
    @lineseparator = sep
