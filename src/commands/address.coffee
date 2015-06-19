Command = require './command'
variables = require '../variables'
Recognizer = require '../classes/recognizer'

module.exports =
class Address extends Command
  @commandName: 'address'
  @commandArgs: ['filename']
  @options: [
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'extract the address from a given image file'
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
      console.log recognizer.text()
    recognizer.open options.filename
