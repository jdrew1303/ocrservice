Command = require './command'
variables = require '../variables'
Watcher = require '../classes/watcher'

module.exports =
class Sortbox extends Command
  @commandName: 'watch'
  @commandArgs: ['pathname']
  @options: [
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'start the path watching service'
  @help: () ->
    """

    """
  action: (program,options) ->
    watcher = new Watcher options.pathname
    watcher.setDebug program.debug||false
    watcher.on 'error', (err) ->
      throw err
    watcher.on 'running', (res) ->
      console.log 'the service is running'
