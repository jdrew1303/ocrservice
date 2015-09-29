Command = require './command'
variables = require '../variables'
Recognizer = require '../classes/recognizer'

module.exports =
class Barcode extends Command
  @commandName: 'barcode'
  @commandArgs: ['filename']
  @options: [
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'extract the barcode from a given image file'
  @help: () ->
    """

    """
  action: (program,options) ->

    console.log 'start', Math.round( (process.memoryUsage()).rss / 1024 )

    recognizer = new Recognizer
    recognizer.setDebug program.debug||false
    recognizer.on 'error', (err) ->
      throw err
    recognizer.on 'open', (res) ->
      console.log 'after open event',Math.round( (process.memoryUsage()).rss / 1024 )
      console.log recognizer.barcode()
      recognizer.barcodeOriginal (codes) ->
        console.log codes
      console.log 'after barcode',Math.round( (process.memoryUsage()).rss / 1024 )
      recognizer.free()
      console.log 'after free',Math.round( (process.memoryUsage()).rss / 1024 )
      fn = () ->
        console.log 'end 10s', Math.round( (process.memoryUsage()).rss / 1024 )
        console.log 'done'
      process.nextTick fn
      if typeof global.gc == 'function'
        global.gc()
    fn = () ->
      console.log 'before open', Math.round( (process.memoryUsage()).rss / 1024 )
      recognizer.open options.filename
      console.log 'after open', Math.round( (process.memoryUsage()).rss / 1024 )

    console.log 'before timer', Math.round( (process.memoryUsage()).rss / 1024 )
    #setTimeout fn, 100
    process.nextTick fn
    if typeof global.gc == 'function'
      global.gc()
