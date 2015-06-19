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
    recognizer = new Recognizer
    recognizer.setDebug program.debug||false
    recognizer.on 'error', (err) ->
      throw err
    recognizer.on 'open', (res) ->
      console.log recognizer.barcode()
    recognizer.open options.filename
