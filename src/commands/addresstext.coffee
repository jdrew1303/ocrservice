Command = require './command'
variables = require '../variables'
Extract = require '../classes/extract'

module.exports =
class AddressText extends Command
  @commandName: 'addresstext'
  @commandArgs: ['address']
  @options: [
    {parameter: "-l,--limit [limit]", description: "the result limit, default is 1"},
    {parameter: "-s,--separator [separator]", description: "the result limit, default is 1"}
  ]
  @commandShortDescription: 'extract the address from a given string'
  @help: () ->
    """

    """
  action: (program,options) ->

    extract = new Extract
    extract.setLineSeparator program.separator||"\n"
    console.log extract.extractAddress(options.address)
