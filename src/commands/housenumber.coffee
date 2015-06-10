Command = require './command'
variables = require '../variables'
Extract = require '../classes/extract'

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
    extract = new Extract
    console.log extract.extractHousenumber(options.streetline)
