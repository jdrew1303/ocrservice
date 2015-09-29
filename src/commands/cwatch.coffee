Command = require './command'
variables = require '../variables'
cluster = require 'cluster'
glob = require 'glob'
path = require 'path'
CWatcherMaster = require '../classes/cwatchermaster'
CWatcherClient = require '../classes/cwatcherclient'

module.exports =
class CWatchCommand extends Command
  @commandName: 'cwatch'
  @commandArgs: ['pathname']
  @options: [
    {parameter: "-d,--debug", description: "enable debug mode"}
  ]
  @commandShortDescription: 'start the path cluster watching service'
  @help: () ->
    """

    """
  action: (program,options) ->
    #@pathname = options.pathname
    #@files = []
    #@cpuCount = require('os').cpus().length
    if cluster.isMaster
      cmaster = new CWatcherMaster cluster, options.pathname
    else
      process.on 'message', (msg) ->
        console.log 'worker', msg, options.pathname
        cclient = new CWatcherClient cluster, options.pathname, msg
        cclient.on 'error', (err) ->
          console.error err
        cclient.on 'stoped', (err) ->
          cclient.db.stop()
          process.exit()
