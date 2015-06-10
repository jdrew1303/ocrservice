Command = require './command'
variables = require '../variables'

module.exports =
class Variables extends Command
  @commandName: 'variables'
  @commandArgs: []
  @commandShortDescription: 'show all variables'
  @help: () ->
    """

    """
  action: (program,options) ->
    console.log variables
