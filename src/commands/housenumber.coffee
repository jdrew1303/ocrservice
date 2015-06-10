Command = require './command'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

module.exports =
class Housenumber extends Command
  @commandName: 'housenumber'
  @commandArgs: ['streetline']
  @options: []
  @commandShortDescription: 'extract the housenumber from a given string'
  @help: () ->
    """

    """
  action: (program,options) ->
    regonizer = new Regonizer
    console.log regonizer.extractHousenumber(options.streetline)
