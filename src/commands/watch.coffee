Command = require './command'
variables = require '../variables'
Watcher = require '../classes/watcher'

module.exports =
class Sortbox extends Command
  @commandName: 'watch'
  @commandArgs: ['pathname']
  @options: [
    {parameter: "-l,--processlist [processlist]", description: "json process instruction list"},
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'start the path watching service'
  @help: () ->
    """

    """
  action: (program,options) ->
    watcher = new Watcher
    watcher.setDebug program.debug
    watcher.on 'error', (err) ->
      throw err
    watcher.on 'running', (res) ->
      console.log 'the service is running'
    watcher.setPath options.pathname
    #watcher.start()
