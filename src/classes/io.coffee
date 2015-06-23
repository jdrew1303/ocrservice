{EventEmitter} = require 'events'
path = require 'path'
fs = require 'fs'
glob = require 'glob'
socketIO = require 'socket.io'
variables = require '../variables'
Recognizer = require '../classes/recognizer'
ERP = require '../classes/erp'
cv = require 'opencv'
udpfindme = require 'udpfindme'

# watching a directory for new files
module.exports =
class IO extends EventEmitter
  constructor: (watcher)->
    @watcher = watcher
    @io = socketIO()
    @io.on 'connection', (opt) => @onIncommingConnection(opt)
    @pathAddition = 'noaddress'
    discoverServer = new udpfindme.Server parseInt( variables.UI_DISCOVER_PORT  ) , '0.0.0.0'
    discoverMessage =
      port: variables.WEBSOCKET_PORT
      type: 'ocrservice'

    discoverServer.setMessage discoverMessage
    @io.listen(variables.WEBSOCKET_PORT)
    @sendings = []
    @clients = {}
    @emit('listen')

  close: ()->
    @io.close()

  setPath: (name) ->
    @pathName = name
    @updateList()

  short: (name) ->
    path.basename(name).replace(/\.tiff$/,'')

  initSocketEvents: (socket) ->
    me = @
    socket.on 'disconnect', (data) => @onDisconnect(socket,data)
    socket.on 'login', (data) => @onLogin(socket,data)
    socket.on 'bad', (data) => @onBadLetter(socket,data)
    socket.on 'save', (data) => @onSaveLetter(socket,data)
    socket.on 'skip', (data) => @onSkipLetter(socket,data)
    socket.on 'check', (data) => @onCheck(socket,data)
    socket.on 'send', (data) => @sendLetter(socket,data)

  updateList: ()->
    me = @
    if me.pathName?
      options =
        cwd: path.join(me.pathName, me.pathAddition)
      pattern = variables.OCR_WATCH_PATTERN

      glob pattern, options, (err,matches) ->
        (me.sendings.push(me.short(name)) for name in matches when me.sendings.indexOf(me.short(name))==-1)
        me.io.emit('sendings',me.sendings)


  onIncommingConnection: (socket) ->
    debug 'onIncommingConnection',socket.id
    @clients[ socket.id ] = socket
    @initSocketEvents(socket)
    socket.emit 'loginRequired'

  onDisconnect: (socket) ->
    debug 'onDisconnect', socket.id
    delete @clients[ socket.id ]


  onLogin: (socket,data)->
    me = @
    options =
      key: 'IO'
      login: data.login
      password: data.password
    warn 'io line 82','fix me!'
    socket.emit 'loginSuccess', @watcher.erp.sid
    @sendLetter socket

  onBadLetter: (socket,data) ->
    me = @
    file = path.join(me.pathName, me.pathAddition, data.id+'.tiff')
    fs.exists file, (exists) ->
      if exists==true
        fs.writeFile path.join(me.pathName, 'bad', path.basename(file)+'.txt'), JSON.stringify(data,null,2) , (err) ->
          if err
            me.emit 'error', err
        fs.rename file, path.join(me.pathName, 'bad', path.basename(file)), (err) ->
          if err
            me.emit 'error', err
    me.sendLetter socket

  onSaveLetter: (socket,data) ->
    console.log 'onSaveLetter 1', data.id, @sendings
    me = @
    item =
      codes: [ data.code ]
      box: [data.box]
      street: data.street
      housenumber: data.housenumber
      housenumberExtension: data.housenumberExtension
      zipCode: data.zipCode
      town: data.town

    file = path.join(me.pathName, me.pathAddition, data.id+'.tiff')

    fs.exists file, (exists) ->
      if exists==true
        fs.rename file, path.join(me.pathName, 'good', path.basename(file)), (err) ->
          if err
            socket.emit 'someerror', 'renaming'
            me.sendLetter socket
          else
            me.sendLetter socket
      else
        me.sendLetter socket
    debug 'io put',item
    me.watcher.erp.put item


  onSkipLetter: (socket,data) ->
    me = @
    @sendings.push data.id
    @sendLetter socket

  onCheck: (socket,data) ->
    me = @
    recognizer = new Recognizer
    recognizer.setDebug false
    recognizer.addresses.push data
    recognizer.once 'boxes', (boxes,codes) ->
      socket.emit 'checked', boxes
    recognizer.sortboxAfterText()

  sendLetter: (socket, data) ->
    me = @
    if @sendings.length == 0
      socket.emit 'empty', true
      @updateList()
    else
      data =
        id: @sendings.shift()
      if @sendings.length == 0
        @updateList()

      name = path.join(me.pathName, me.pathAddition,data.id+'.tiff')
      recognizer = new Recognizer
      recognizer.setDebug false
      recognizer.on 'error', (err) ->
        me.onBadLetter socket, data

      recognizer.on 'open', (res) ->
        r = recognizer.outerbounding()
        item =
          rect: r
        recognizer.getText item

        data.txt = recognizer.texts
        data.zipCode = ""
        data.town = ""
        data.street = ""
        data.housenumber = ""
        data.housenumberExtension = ""

        if data.txt.length>0
          adr = recognizer.getAddress data.txt[0]
          data.adr = adr
          data.zipCode = adr.zipCode
          data.town = adr.town
          data.street = adr.street
          data.housenumber = adr.housenumber
          data.housenumberExtension = adr.housenumberExtension

        cropped = recognizer.image.crop r.x,r.y,r.width,r.height
        cropped.rotate 270
        if typeof socket.mywidth == 'number'
          ratio = socket.mywidth/r.width
          cropped.resize  r.height*ratio, r.width*ratio
        cropped.toBufferAsync (err,buffer)->
          inlineimage = "data:image/jpeg;base64,"+buffer.toString('base64')
          data.inlineimage = inlineimage
          socket.emit 'letter',data
      recognizer.open name, false
