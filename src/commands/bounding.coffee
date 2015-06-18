Command = require './command'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

module.exports =
class Bounding extends Command
  @commandName: 'bounding'
  @commandArgs: ['filename']
  @options: [
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'extract the outer bounding box from a given image file'
  @help: () ->
    """

    """
  action: (program,options) ->
    regonizer = new Regonizer
    regonizer.setDebug program.debug||false
    regonizer.on 'error', (err) ->
      throw err
    regonizer.on 'open', (res) ->
      console.log regonizer.outerbounding()
    regonizer.open options.filename
