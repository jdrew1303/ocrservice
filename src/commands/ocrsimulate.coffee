Command = require './command'
variables = require '../variables'
cluster = require 'cluster'
glob = require 'glob'
path = require 'path'
fs = require 'fs'
ERP = require '../classes/erp'
DB = require '../classes/db'
Recognizer = require '../classes/recognizer'

module.exports =
class OCRSimulate extends Command
  @commandName: 'ocrsimulate'
  @commandArgs: ['row','box']
  @options: [
    {parameter: "-d,--debug", description: "enable debug mode"}
  ]
  @commandShortDescription: 'start the path cluster watching service'
  @help: () ->
    """

    """
  action: (program,options) ->
    @row = options.row
    @box = options.box
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
    debug 'simulate','login success'
    @send()

  onERPPut: (msg) ->
    setTimeout @send.bind(@),5000
    #process.nextTick @dispatchTask.bind(@)

  onERPFastAccess: (list) ->
    #debug 'cmaster', 'on fastaccess '+list.length
    #@db.fastaccess(list)
  onERPError: (msg) ->
    console.error msg

  send: () ->
    codes=[(new Date()).getTime()]
    box =
      sortiergang: @row
      sortierfach: @box
      strid: -1
      mandant: null
      regiogruppe: null
      bereich: 'NA',
      plz: '99999'
      ort: 'Musterhausen'
      ortsteil: ''
      hnvon: '0000'
      hnbis: '1000'
      gerade: '1'
      ungerade: '1'
      strasse: 'Musterweg'
    item =
      name: "Max Muster"
      street: "Musterweg"
      housenumber: "1"
      housenumberExtension: "a"
      flatNumber: ""
      zipCode: "99999"
      town: "Musterhausen"
      state: true,
      message: ""
      box: [box]
      codes: codes
      ocr_street: ''
      ocr_zipCode: ''
      ocr_town: ''
      district: ''
    info 'send',codes.join(',')
    @erp.put item
