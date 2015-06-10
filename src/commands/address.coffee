Command = require './command'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

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
    regonizer = new Regonizer options.filename
    regonizer.setDebug program.debug||false
    regonizer.on 'error', (err) ->
      throw err
    regonizer.on 'open', (res) ->
      console.log regonizer.address()
    regonizer.open()
