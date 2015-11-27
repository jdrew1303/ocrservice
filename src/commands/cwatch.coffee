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
moveFile = (orig,dest,cb) ->
  if fs.existsSync orig

    source = fs.createReadStream orig
    dest = fs.createWriteStream dest
    source.pipe dest
    source.on 'end',  ()->
      fs.unlinkSync orig
      cb null
    source.on 'error', cb
  else
    cb(null)

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

        if not fs.existsSync(filename)
          process.exit()

        pathname = options.pathname
        recognizer = new Recognizer db, processlist
        recognizer.setDebug program.debug||false
        recognizer.on 'error', (err) ->
          throw err
        recognizer.on 'open', (res) ->
          recognizer.run()
        recognizer.on 'boxes', (res,codes) ->
          #console.log JSON.stringify(res,null,1),codes
          console.timeEnd "elapsed"
          name = codes.join('.')



          bad = path.join(pathname, 'good')
          goodPath = path.join(pathname, 'good')
          noAddressPath = path.join(pathname, 'noaddress')
          noCodePath = path.join(pathname, 'nocode')

          if program.noaddress
            noAddressPath = program.noaddress

          if program.good
            goodPath = program.good

          if program.nocode
            noCodePath = program.nocode

          if program.bad
            bad = program.bad



          if res.length>0 and codes.length>0 and res[0].box?.length>0
            debug 'cwatch', 'good '+filename
            moveFile filename, path.join(goodPath,name+path.extname(filename)), (err)->
              process.exit()
            #send good
            process.send res[0]
          else if codes.length>0
            box =
              sortiergang: 'NA'
              sortierfach: 'NA'
              strid: -1
              mandant: '6575'
              regiogruppe: 'Standardbriefsendungen'
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
            debug 'cwatch', 'noaddress '+filename
            process.send item
            moveFile filename, path.join(noAddressPath,name+path.extname(filename)), (err)->
              process.exit()
          else if codes.length==0
            name = (new Date()).getTime()
            #save no code
            debug 'cwatch', 'nocode '+filename
            moveFile filename, path.join(noCodePath,name+path.extname(filename)), (err)->
              process.exit()
          db.connection.end()

        recognizer.open filename, true
