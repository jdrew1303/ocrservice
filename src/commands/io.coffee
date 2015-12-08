Command = require './command'
variables = require '../variables'
IO = require '../classes/io'

module.exports =
class Sortbox extends Command
  @commandName: 'io'
  @commandArgs: ['noaddress','goodpath','badpath']
  @options: [
#    {parameter: "-l,--processlist [processlist]", description: "json process instruction list"},
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'start the path io service'
  @help: () ->
    """

    """
  action: (program,options) ->
    @noaddress = options.noaddress
    @goodpath = options.goodpath
    @badpath = options.badpath
    @socketServer()

  socketServer: () ->
    @io_client = new IO(@)
    @io_client.setPath(@noaddress,@goodpath,@badpath)
