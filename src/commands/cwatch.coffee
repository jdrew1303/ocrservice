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
    {parameter: "--noaddress [noaddress]", description: "path for no address"}
    {parameter: "--nocode [nocode]", description: "path for no code"}
    {parameter: "--good [good]", description: "path for good"}
    {parameter: "--bad [bad]", description: "path for bad"}
    {parameter: "-c,--cpus [cpus]", description: "how much cpus used for"}
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

      cmaster = new CWatcherMaster cluster, options.pathname,options.cpus
    else
      exitfn = ()->
        process.exit()
      setTimeout exitfn, 60000

      process.on 'message', (msg) ->
        console.log 'worker', msg, options.pathname
        cclient = new CWatcherClient cluster, options.pathname, msg
        if options.noaddress
          cclient.setNoAddressPath options.noaddress

        if options.good
          cclient.setGoodPath options.good

        if options.nocode
          cclient.setNoCodePath options.nocode

        if options.bad
          cclient.setBadPath options.bad

        cclient.on 'error', (err) ->
          console.error err
        cclient.on 'stoped', (err) ->
          cclient.db.stop()
          process.exit()
