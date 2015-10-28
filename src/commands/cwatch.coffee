Command = require './command'
variables = require '../variables'
cluster = require 'cluster'
glob = require 'glob'
path = require 'path'
fs = require 'fs'
CWatcherMaster = require '../classes/cwatchermaster'
DB = require '../classes/db'
Recognizer = require '../classes/recognizer'

#CWatcherClient = require '../classes/cwatcherclient'

module.exports =
class CWatchCommand extends Command
  @commandName: 'cwatch'
  @commandArgs: ['pathname']
  @options: [
    {parameter: "-l,--processlist [processlist]", description: "json process instruction list"},
    {parameter: "--noaddress [noaddress]", description: "path for no address"}
    {parameter: "--nocode [nocode]", description: "path for no code"}
    {parameter: "--good [good]", description: "path for good"}
    {parameter: "--bad [bad]", description: "path for bad"}
    {parameter: "--quick", description: "quickstart no db update"}
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
      cmaster = new CWatcherMaster cluster, options.pathname,program.cpus,program.quick
    else
      exitfn = ()->
        process.exit()
      setTimeout exitfn, 60000

      process.on 'message', (msg) ->

        db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST

        try
          processlist = require(program.processlist)
        catch e
        console.log msg
        console.time "elapsed"
        filename = path.join(options.pathname,msg)
        pathname = options.pathname
        recognizer = new Recognizer db, processlist
        recognizer.setDebug program.debug||false
        recognizer.on 'error', (err) ->
          throw err
        recognizer.on 'open', (res) ->
          recognizer.test()
        recognizer.on 'boxes', (res,codes) ->
          console.log JSON.stringify(res,null,1),codes
          console.timeEnd "elapsed"
          name = codes.join('.')

          bad = path.join(pathname, 'good')
          goodPath = path.join(pathname, 'good')
          noAddressPath = path.join(pathname, 'noaddress')
          noCodePath = path.join(pathname, 'nocode')

          if options.noaddress
            noAddressPath = options.noaddress

          if options.good
            goodPath = options.good

          if options.nocode
            nocode = options.nocode

          if options.bad
            bad = options.bad

          if res.length>0 and codes.length>0 and res[0].box?.length>0
            fs.rename filename, path.join(goodPath,name+path.extname(filename)), (err)->
              process.exit()
            #send good
            process.send res[0]
          else if codes.length>0
            box =
              sortiergang: 'NA'
              sortierfach: 'NA'
              strid: -1
              mandant: null
              regiogruppe: null
              bereich: 'NA',
              plz: ''
              ort: ''
              ortsteil: ''
              hnvon: ''
              hnbis: ''
              gerade: ''
              ungerade: ''
              strasse: ''
            item =
              name: ""
              street: ""
              housenumber: ""
              housenumberExtension: ""
              flatNumber: ""
              zipCode: ""
              town: ""
              state: true,
              message: ""
              box: [box]
              codes: codes
              ocr_street: ''
              ocr_zipCode: ''
              ocr_town: ''
              district: ''
            #send no address
            process.send item
            fs.rename filename, path.join(noAddressPath,name+path.extname(filename)), (err)->
              process.exit()
          else if codes.length==0
            name = (new Date()).getTime()
            #save no code
            fs.rename filename, path.join(code,name+path.extname(filename)), (err)->
              process.exit()
          db.connection.end()

        recognizer.open filename, true
