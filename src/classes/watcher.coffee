{EventEmitter} = require 'events'
path = require 'path'
fs = require 'fs'
glob = require 'glob'
IO = require '../classes/io'
socket = require 'socket.io-client'
variables = require '../variables'
Recognizer = require './recognizer'
DB = require './db'
ERP = require './erp'
udpfindme = require 'udpfindme'

# watching a directory for new files
module.exports =
class Watcher extends EventEmitter
  constructor: (pathName)->
    @intervalTimeout = 1000
    @debug = false
    @run = false
    @files = []
    @fileIndex = 0

    @discovery = new udpfindme.Discovery 31111
    @discovery.on 'found', (data,remote) => @onDiscoveryFound(data,remote)
    @discovery.on 'timeout', () => @onDiscoveryTimout()
    @discovery.discover()


    @db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    @db.setLimit 100
    @db.on 'error', (err) ->
      throw err

    options =
      client: variables.ERP_CLIENT
      login: variables.ERP_LOGIN
      password: variables.ERP_PASSWORD

    @erp = new ERP options
    @erp.on 'loginError', (msg) => @onERPLoginError(msg)
    @erp.on 'loginSuccess', (msg) => @onERPLoginSuccess(msg)
    @erp.on 'put', (msg) => @onERPPut(msg)
    @erp.on 'error', (msg) => @onERPPut(msg)
    @erp.on 'connect', (msg) => @onERPConnect(msg)

  onERPConnect: (msg) ->
    @erp.login()

  onDiscoveryFound: (data,remote)->
    if typeof data.type == 'string'
      if data.type == 'sorter'
        @url = 'http://'+remote.address+':'+data.port+'/'
        if not @io?.connected
          @setIoConnectTimer()

  setIoConnectTimer: ()->
    if typeof @ioConnectTimer!='undefined'
      clearTimeout @ioConnectTimer
    @ioConnectTimer = setTimeout @setIO.bind(@), 1000

  setIO: () ->
    opt =
      autoConnect: false
    debug 'watcher dispatcher',@url
    @io = socket @url, opt
    @io.on 'connect', @socketConnected.bind(@)
    @io.on 'disconnect', @socketDisconnected.bind(@)
    @io.on 'start', @start.bind(@)
    @io.on 'stop', @stop.bind(@)
    @io.connect()


  onDiscoveryTimout: () ->
    @discovery.discover()


  onERPLoginError: (msg) ->
    console.log msg
  onERPLoginSuccess: (msg) ->
    @start()
    console.log msg
  onERPPut: (msg) ->
    console.log msg
  onERPError: (msg) ->
    console.log msg

  socketConnected: ()->
    me = @
    me.debugMessage 'socket connected'
    me.io.emit 'ocrservice', me.pathName

  socketDisconnected: ()->
    me = @
    me.debugMessage 'socket disconnected'
    me.stop()

  setPath: (pathName)->
    if not pathName
      throw new Error('you must give a path name')
    @pathName = pathName
    @socketServer()
    me = @
    fs.exists @pathName, (exists)->

      if not exists
        throw new Error 'the directory does not exists ' + me.pathName

      else

        me.createPath 'good'
        me.createPath 'unclear'
        me.createPath 'nocode'
        me.createPath 'noaddress'
        me.createPath 'bad'

  createPath: (name)->

    me = @
    fs.exists path.join(me.pathName, name), (exists)->
      if not exists
        fs.mkdir path.join(me.pathName, name), (error)->
          if error
            me.emit 'error',err

  setDebug: (mode)->
    @debug = mode

  debugMessage: (msg)->
    if @debug
      console.log 'debug',msg

  start: ()->
    me = @

    if not @run
      me.emit 'start', true
      @run = true
      me.watch()
      #me.socketServer()


  stop: ()->
    me = @
    if @run
      @run = false
      me.emit 'stop', true
      if @io_client?
        true
        #@io_client.close()
        #@io_client = null

  socketServer: () ->
    @io_client = new IO(@)
    @io_client.setPath(@pathName)


  watch: ()->
    me = @
    if not @run
      false
    else
      options =
        cwd: me.pathName
      pattern = variables.OCR_WATCH_PATTERN
      debug 'watch','glob'
      glob pattern, options, (err,matches) ->
        if err
          me.emit 'error',err
        else
          me.files = matches
          me.fileIndex = 0
          me.debugMessage(me.files .length,'files')
          me.runList()

  recognizeBoxes: (res,codes)->

    me = @
    if not @run
      false
    else

      me.debugMessage 'recognizerBoxes'
      file = path.join(me.pathName, me.files[me.fileIndex])
      if codes.length == 0
        #no code
        name = me.current_stat.ctime.getTime()
        fs.rename file, path.join(me.pathName, 'nocode', name+path.extname(file)), (err) ->
          if err
            me.emit 'error', err

      else
        if res.length == 0
          #no address
          name = codes.join('.')
          fs.rename file, path.join(me.pathName, 'noaddress', name+path.extname(file)), (err) ->
            if err
              console.trace err
              me.emit 'error', err


        else if res.length == 1

          name = res[0].codes.join('.')
          console.log(file, path.join(me.pathName, 'good', name+path.extname(file)))
          fs.rename file, path.join(me.pathName, 'good', name+path.extname(file)), (err) ->
            if err
              console.trace err
              me.emit 'error', err
            else
              me.erp.put res[0]
              me.io.emit 'new',res[0]

        else
          name = res[0].codes.join('.')

          fs.rename file, path.join(me.pathName, 'unclear', name+path.extname(file)), (err) ->
            if err
              console.trace err
              me.emit 'error', err
          fs.writeFile path.join(me.pathName, 'unclear', name+'.txt'), JSON.stringify(res,null,2) , (err) ->
            if err
              me.emit 'error', err

      me.debugMessage JSON.stringify(res,null,2)
      me.debugMessage 'next'
      setTimeout me.nextFile.bind(me), 1

  statFile: (err,stat)->
    me = @
    if not @run
      false
    else
      now = new Date
      now.setSeconds now.getSeconds() - 1

      if stat.ctime < now
        me.current_stat = stat
        me.debugMessage 'recognize'
        recognizer = new Recognizer me.db
        recognizer.setDebug me.debug
        recognizer.on 'error', (err) ->
          file = path.join(me.pathName, me.files[me.fileIndex])
          fs.writeFile path.join(me.pathName, 'bad', path.basename(file)+'.txt'), JSON.stringify(err,null,2) , (err) ->
            if err
              me.emit 'error', err
          fs.rename file, path.join(me.pathName, 'bad', path.basename(file)), (err) ->
            if err
              me.emit 'error', err
            else
              setTimeout me.nextFile.bind(me), 500
        recognizer.on 'open', (res) ->
          recognizer.barcode()
          recognizer.sortbox()
        recognizer.on 'boxes', me.recognizeBoxes.bind(me)
        recognizer.open path.join(me.pathName, me.files[me.fileIndex])
      else
        me.debugMessage 'file is too young'
        setTimeout me.nextFile.bind(me), 500

  checkFile: () ->
    me = @
    if not @run
      false
    else
      me.debugMessage 'stat file'
      fs.stat path.join(me.pathName, me.files[me.fileIndex]), me.statFile.bind(me)

  nextFile: (error)->
    me = @
    if not me.run
      false
    else
      if error
        me.emit 'error',error
      else
        me.fileIndex++
        me.runList.bind(me)()

  runList: () ->
    me = @
    if not @run
      false
    else
      if me.fileIndex == me.files.length
        me.debugMessage 'wait for next turn'
        setTimeout me.watch.bind(me), me.intervalTimeout
      else
        me.debugMessage 'check file',path.join(me.pathName, me.files[me.fileIndex])
        me.checkFile()
