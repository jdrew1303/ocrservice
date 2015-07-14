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


    @db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    @db.setLimit 100
    @db.on 'updated', (num) => @onDBUpdated(num)

    @db.on 'error', (err) ->
      throw err

    options =
      key: 'watcher'
      client: variables.ERP_CLIENT
      login: variables.ERP_LOGIN
      password: variables.ERP_PASSWORD

    @erp = new ERP options
    @erp.on 'loginError', (msg) => @onERPLoginError(msg)
    @erp.on 'loginSuccess', (msg) => @onERPLoginSuccess(msg)
    @erp.on 'put', (msg) => @onERPPut(msg)
    @erp.on 'fastaccess', (msg) => @onERPFastAccess(msg)
    @erp.on 'error', (msg) => @onERPError(msg)
    @erp.on 'connect', (msg) => @onERPConnect(msg)
    @erp.on 'disconnect', (msg) => @onERPDisconnect(msg)

  onERPConnect: (msg) ->
    debug 'erp login', '---'
    @erp.login()
  onERPDisconnect: () ->
    debug 'erp disconnect', '---'
    @run=false


  onERPLoginError: (msg) ->
    console.log msg
  onERPLoginSuccess: (msg) ->
    @erp.fastaccess()
    debug 'watcher','login success'
  onERPPut: (msg) ->
    setTimeout @nextFile.bind(@), 1
  onERPFastAccess: (list) ->
    debug 'watcher', 'on fastaccess '+list.length
    @db.fastaccess(list)
  onDBUpdated: (num) ->
    debug 'updated', 'ready'
    @start()

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
      #debug 'watch','glob'
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
        me.fullScann(codes,'nocode')
        #name = me.current_stat.ctime.getTime()
        #fs.rename file, path.join(me.pathName, 'nocode', name+path.extname(file)), (err) ->
        #  if err
        #    console.trace err
        #    me.emit 'error', err
        #  else
        #    setTimeout me.nextFile.bind(me), 1
      else
        if res.length == 0 or typeof res[0].box == 'undefined' or res[0].box.length==0
          me.fullScann(codes,'noaddress')


        else if res.length == 1

          name = res[0].codes.join('.')
          fs.rename file, path.join(me.pathName, 'good', name+path.extname(file)), (err) ->
            if err
              console.trace err
              me.emit 'error', err
            else
              debug 'put', res
              me.erp.put res[0]

        else
          name = res[0].codes.join('.')

          fs.rename file, path.join(me.pathName, 'unclear', name+path.extname(file)), (err) ->
            if err
              console.trace err
              me.emit 'error', err
          fs.writeFile path.join(me.pathName, 'unclear', name+'.txt'), JSON.stringify(res,null,2) , (err) ->
            if err
              console.trace err
              me.emit 'error', err
            else
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
      if me.fileIndex == me.files.length or me.files.length==0
        me.debugMessage 'wait for next turn'
        setTimeout me.watch.bind(me), me.intervalTimeout
      else
        console.log me.pathName, me.files, me.fileIndex, me.files[me.fileIndex]

        me.debugMessage 'check file',path.join(me.pathName, me.files[me.fileIndex])
        me.checkFile()


  fullScann: (codes,failpath) ->
    me = @
    file = path.join(me.pathName, me.files[me.fileIndex])

    debug 'fullscann', file
    recognizer = new Recognizer
    recognizer.setDebug false
    recognizer.on 'error', (err) ->
      me.noAddress(codes)

    recognizer.on 'open', (res) ->
      r = recognizer.outerbounding()
      item =
        rect: r
      recognizer.barcode()
      recognizer.getText item
      data =
        codes: recognizer.barcodes
      data.txt = recognizer.texts
      data.zipCode = ""
      data.town = ""
      data.street = ""
      data.housenumber = ""
      data.housenumberExtension = ""
      if data.txt.length>0
        adr = recognizer.getAddress data.txt[0], true
        data.adr = adr
        data.zipCode = adr.zipCode
        data.town = adr.town
        data.street = adr.street
        data.housenumber = adr.housenumber
        data.housenumberExtension = adr.housenumberExtension
      debug 'sortboxAfterText', data
      recognizer.addresses.push data
      recognizer.sortboxAfterText()

    recognizer.once 'boxes', (boxes,codes) ->
      name = codes.join('.')
      if boxes.length>0 and codes.length>0
        boxes[0].codes = codes
        fs.rename file, path.join(me.pathName, 'good', name+path.extname(file)), (err) ->
          if err
            console.trace err
            me.emit 'error', err
          else
            debug 'put', boxes
            me.erp.put boxes[0]
      else
        fs.rename file, path.join(me.pathName, failpath, name+path.extname(file)), (err) ->
          if err
            console.trace err
            me.emit 'error', err
          else
            setTimeout me.nextFile.bind(me), 1
    recognizer.open file, false
  noAddress: (codes) ->
    #no address
    file = path.join(me.pathName, me.files[me.fileIndex])
    name = codes.join('.')
    fs.rename file, path.join(me.pathName, 'noaddress', name+path.extname(file)), (err) ->
      if err
        console.trace err
        me.emit 'error', err
      else
        setTimeout me.nextFile.bind(me), 1
