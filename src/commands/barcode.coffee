Command = require './command'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

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
    regonizer = new Regonizer options.filename
    regonizer.setDebug program.debug||false
    regonizer.on 'error', (err) ->
      throw err
    regonizer.on 'open', (res) ->
      console.log regonizer.barcode()
    regonizer.open()
