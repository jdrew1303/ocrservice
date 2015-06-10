Command = require './command'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

module.exports =
class Address extends Command
  @commandName: 'address'
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

    regonizer = new Regonizer
    regonizer.setLineSeparator program.separator||"\n"
    console.log regonizer.extractAddress(options.address)
