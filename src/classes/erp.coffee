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
    debug 'set erp connect',@options.key
    opt =
      autoConnect: false

    @erp = client @url, opt
    debug 'start', 'set up erp io '+@url+''+' '+@options.key
    @erp.on 'connect_error', (err) => @onConnectError(@erp,err)
    @erp.on 'connect', (socket) => @onConnect(socket)
    @erp.on 'disconnect', (socket) => @onDisconnect(socket)
    @erp.on 'loginSuccess', (data) => @onLoginSuccess(@erp,data)
    @erp.on 'loginError', (data) => @onLoginError(@erp,data)
    @erp.on 'logout', (data) => @onLogout(@erp,data)
    @erp.on 'put', (data) => @onPut(@erp,data)
    @erp.on 'fastaccess', (data) => @onFastAccess(@erp,data)
    @erp.connect()

  onConnectError: (socket,err) ->
    @erp.disconnect()
    debug 'connect_error', JSON.stringify(err,null,0)+' #'+@erp.id+' #'+socket.id

  onConnect: () ->
    debug 'erp connect', @options.key
    @emit 'connect'

  onDisconnect: () ->
    @emit 'disconnect', @options.key
    debug 'disconnect', '.'

  login: () ->
    debug 'erp login'
    if @sid!=''
      @logout()
    opt =
      client: @options.client,
      login: @options.login,
      password: @options.password

    if @erp?.connected==true
      @erp.emit 'login', opt
    else
      error 'erp', 'not connected'
      @emit 'error', 'not connected'

  onLoginSuccess: (socket,data) ->
    @sid = data
    debug 'erp on login', data
    @emit 'loginSuccess', data
  onLoginError: (socket,msg) ->
    @sid = ''
    debug 'erp', msg
    @emit 'loginError', msg

  onFastAccess: (socket,list) ->
    debug 'erp', 'on fastaccess'
    @emit 'fastaccess', list

  logout: () ->
    if typeof @erp == 'object' and @erp.connected==true
      @erp.emit 'logout'
    @sid = ''
    @emit 'logged out'

  fastaccess: () ->
    if typeof @erp == 'object' and @erp.connected==true
      @erp.emit 'fastaccess', {}
    else
      @emit 'error', 'not connected'

  put: (item) ->
    if typeof @erp == 'object' and @erp.connected==true
      @erp.emit 'put', item
    else
      @emit 'error', 'not connected'

  onPut: (socket,data) ->
    @emit 'put', data
