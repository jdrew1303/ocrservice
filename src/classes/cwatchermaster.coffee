{EventEmitter} = require 'events'
path = require 'path'
fs = require 'fs'
glob = require 'glob'
IO = require '../classes/io'
socket = require 'socket.io-client'
variables = require '../variables'
DB = require './db'
ERP = require './erp'
udpfindme = require 'udpfindme'

module.exports =
class CWatcherMaster extends EventEmitter
  constructor: (cluster, pathName,cpus,quick)->
    @intervalTimeout = 1000
    @debug = false
    if typeof quick=='undefined'
      quick=false
    @quick = quick
    @run = false
    @files = []
    @cluster = cluster
    me = @
    @cluster.on 'exit', (worker, code, signal) ->
      console.log 'worker ' + worker.process.pid + ' died'
      me.dispatchTask()
    @cluster.on 'online', (worker) => @onWorkerOnline(worker)


    @pathname = pathName
    if typeof cpus=='undefined'
      @cpuCount = require('os').cpus().length
      if @cpuCount>4
        @cpuCount--
        @cpuCount--
    else
      @cpuCount = cpus

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
    debug 'cmaster', 'wait for erp'

  onERPConnect: (msg) ->
    debug 'erp login', '---'
    @erp.login()
  onERPDisconnect: () ->
    debug 'erp disconnect', '---'
    @run=false
  onERPLoginError: (msg) ->
    console.log msg
  onERPLoginSuccess: (msg) ->
    debug 'cmaster','login success'
    if @quick
      @start() # start without updateing the db
    else
      @erp.fastaccess()
  onERPPut: (msg) ->
    process.nextTick @dispatchTask.bind(@)

  onERPFastAccess: (list) ->
    debug 'cmaster', 'on fastaccess '+list.length
    @db.fastaccess(list)
  onERPError: (msg) ->
    console.error msg
  onDBUpdated: (num) ->
    debug 'updated', 'ready'
    @start()
  start: ()->
    me = @
    if not @run
      me.emit 'start', true
      @run = true
      @timer = setInterval @readDirectory.bind(@), 5000
  stop: ()->
    me = @
    if @run
      @run = false
      clearInterval @timer
      me.emit 'stop', true
      if @io_client?
        true

  onWorkerOnline: (worker) ->
    me=@
    if me.files.length > 0
      worker.on 'message', (msg) ->
        #console.log 'PUTTING', msg
        me.erp.put msg
      worker.send me.files.pop()
    else
      worker.kill()
      console.log 'no file anymore'
      #process.nextTick me.readDirectory.bind(me)

  dispatchTask: () ->
    me=@
    if me.files.length == 0
      null
    else
      count = 0
      Object.keys(@cluster.workers).forEach (id) ->
        count++
      while count < @cpuCount
        @cluster.fork()
        count++


  readDirectory: () ->
    count = 0
    Object.keys(@cluster.workers).forEach (id) ->
      count++
    debug 'cmaster', 'readDirectory, active clients '+count
    if @run
      options =
        cwd: @pathname
      pattern = variables.OCR_WATCH_PATTERN
      me = @
      glob pattern, options, (err,matches) ->
        me.files = matches
        me.dispatchTask()
