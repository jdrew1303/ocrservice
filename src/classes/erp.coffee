request = require 'request'
{EventEmitter} = require 'events'
udpfindme = require 'udpfindme'
client = require 'socket.io-client'


module.exports =
class ERP extends EventEmitter
  constructor: (options)->
    @options = options
    @sid = ''
    @discovery = new udpfindme.Discovery 31112 #search for erp-dispatcher
    @discovery.on 'found', (data,remote) => @onDiscoveryFound(data,remote)
    @discovery.on 'timeout', () => @onDiscoveryTimout()
    @discovery.discover()

  onDiscoveryFound: (data,remote) ->
    if typeof data.type == 'string'
      if data.type == 'erp'
        @url = 'http://'+remote.address+':'+data.port+'/'
        if not @erp?.connected
          @setIoConnectTimer()

  onDiscoveryTimout: () ->
    @discovery.discover()

  setIoConnectTimer: ()->
    if typeof @ioConnectTimer!='undefined'
      clearTimeout @ioConnectTimer
    @ioConnectTimer = setTimeout @setErp.bind(@), 1000


  setErp: () ->
    debug 'io connect',@erp?.connected
    opt =
      autoConnect: false

    @erp = client @url, opt
    debug 'start', 'set up io '+@url+''
    @erp.on 'connect_error', (err) => @onConnectError(@erp,err)
    @erp.on 'connect', (socket) => @onConnect(socket)
    @erp.on 'disconnect', (socket) => @onDisconnect(socket)
    @erp.on 'login', (data) => @onLogin(@erp,data)
    @erp.on 'logout', (data) => @onLogout(@erp,data)
    @erp.on 'put', (data) => @onPut(@erp,data)
    @erp.connect()

  onConnectError: (socket,err) ->
    @erp.disconnect()
    debug 'connect_error', JSON.stringify(err,null,0)+' #'+@erp.id+' #'+socket.id

  onConnect: () ->
    debug 'connect', @erp.id

  onDisconnect: () ->
    debug 'disconnect', @erp.id

  login: () ->
    if @sid!=''
      @logout()
    opt =
      client: @options.client,
      login: @options.login,
      password: @options.password
    if typeof @erp == 'object' and @erp.connected==true
      @erp.emit 'login', opt
    else
      @emit 'error', 'not connected'
  onLogin: (socket,data) ->
    @sid = data
    @emit 'loginSuccess', data

  logout: () ->
    if typeof @erp == 'object' and @erp.connected==true
      @erp.emit 'logout'
    @sid = ''
    @emit 'logged out'

  getFastAccessTour: () ->

  put: (item) ->
    if typeof @erp == 'object' and @erp.connected==true
      @erp.emit 'put', item
    else
      @emit 'error', 'not connected'

  onPut: (socket,data) ->
    @emit 'put', data
