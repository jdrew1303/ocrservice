{EventEmitter} = require 'events'
path = require 'path'
fs = require 'fs'
glob = require 'glob'
socketIO = require 'socket.io'
variables = require '../variables'
Regonizer = require '../classes/regonizer'
ERP = require '../classes/erp'
cv = require 'opencv'
updfindme = require 'updfindme'

# watching a directory for new files
module.exports =
class IO extends EventEmitter
  constructor: (pathName)->
    @io = socketIO()
    @io.on 'connection', (opt) => @onIncommingConnection(opt)
    @pathAddition = 'noaddress'
    discoverServer = new updfindme.Server parseInt( variables.UI_DISCOVER_PORT )
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
    socket.on 'disconnect', (data) ->
      me.onDisconnect(socket, data)
    socket.on 'work', (data) ->
      me.onWork(socket, data)
    socket.on 'login', (data) ->
      me.onLogin(socket, data)
    socket.on 'setbad', (data) ->
      me.onSetBad(socket, data)

  updateList: ()->
    me = @
    if me.pathName?
      options =
        cwd: path.join(me.pathName, me.pathAddition)
      pattern = variables.OCR_WATCH_PATTERN

      glob pattern, options, (err,matches) ->
        (me.sendings.push(me.short(name)) for name in matches when me.sendings.indexOf(me.short(name))==-1)
        me.io.emit('sendings',me.sendings)
        #setTimeout me.updateList.bind(me), 2000
    #else
      #setTimeout me.updateList.bind(me), 2000


  onIncommingConnection: (socket) ->
    console.log 'onIncommingConnection',socket.id
    @clients[ socket.id ] = socket
    @initSocketEvents(socket)
    socket.emit 'loginRequired'

  onDisconnect: (socket) ->
    if @clients[ socket.id ].erp?
      @clients[ socket.id ].erp.logout()

    delete @clients[ socket.id ]
    console.log 'onDisconnect'

  onLogin: (socket,data)->
    me = @
    options =
      url: variables.ERP_URL
      client: variables.ERP_CLIENT
      login: data.login
      password: data.password

    socket.erp = new ERP options
    socket.erp.on 'loginSuccess', (sid) ->
      me.sendLetter socket
    socket.erp.on 'loginError', (error) ->
      socket.emit 'loginError', error
    socket.erp.login()

  onSetBad: (socket,data) ->
    me = @
    file = path.join(me.pathName, me.pathAddition, data.id+'.tiff')
    fs.writeFile path.join(me.pathName, 'bad', path.basename(file)+'.txt'), JSON.stringify(data,null,2) , (err) ->
      if err
        me.emit 'error', err
    fs.rename file, path.join(me.pathName, 'bad', path.basename(file)), (err) ->
      if err
        me.emit 'error', err
    me.sendLetter socket

  sendLetter: (socket) ->
    me = @
    data =
      id: @sendings.pop()
    if @sendings.length == 0
      @updateList()

    name = path.join(me.pathName, me.pathAddition,data.id+'.tiff')
    regonizer = new Regonizer
    regonizer.setDebug false
    regonizer.on 'error', (err) ->
      console.log err
      socket.emit 'letter', data #do something better

    regonizer.on 'open', (res) ->
      r = regonizer.outerbounding()
      item =
        rect: r
      regonizer.getText item

      data.txt = regonizer.texts
      data.zipCode = ""
      data.town = ""
      data.street = ""
      data.housenumber = ""
      data.housenumberExtension = ""

      if data.txt.length>0
        adr = regonizer.getAddress data.txt[0]
        data.adr = adr
        data.zipCode = adr.zipCode
        data.town = adr.town
        data.street = adr.street
        data.housenumber = adr.housenumber
        data.housenumberExtension = adr.housenumberExtension

      cropped = regonizer.image.crop r.x,r.y,r.width,r.height
      cropped.rotate 270
      cropped.toBufferAsync (err,buffer)->
        inlineimage = "data:image/jpeg;base64,"+buffer.toString('base64')
        data.inlineimage = inlineimage
        socket.emit 'letter',data
    regonizer.open name



  onWork: (socket,data) ->
    console.log 'work', data
    me = @
    ( me.clients[id].emit('work',data) for id of me.clients when socket.id!=id )
    name = path.join(me.pathName, 'noaddress',data.id+'.tiff')
    regonizer = new Regonizer
    regonizer.setDebug false
    regonizer.on 'error', (err) ->
      socket.emit('do',data) #do something better
    regonizer.on 'open', (res) ->
      r = regonizer.outerbounding()
      cropped = regonizer.image.crop r.x,r.y,r.width,r.height
      cropped.rotate 270
      cropped.toBufferAsync (err,buffer)->
        inlineimage = "data:image/jpeg;base64,"+buffer.toString('base64')
        data.inlineimage = inlineimage
        socket.emit('do',data)

    regonizer.open name