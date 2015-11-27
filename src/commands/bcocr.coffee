nodeModuleCache= require 'fast-boot'
Command = require './command'
variables = require '../variables'
cluster = require 'cluster'
glob = require 'glob'
path = require 'path'
fs = require 'fs'
CBcOcrMaster = require '../classes/cbcocrmaster'
DB = require '../classes/db'
Extract = require '../classes/extract'
Recognizer = require '../classes/recognizer'
{spawn} = require('child_process')

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
class CBcOcr extends Command
  @commandName: 'bcocr'
  @commandArgs: ['source']
  @options: [
    {parameter: "-l,--processlist [processlist]", description: "json process instruction list"},
    {parameter: "--noaddress [noaddress]", description: "path for no address"}
    {parameter: "--nocode [nocode]", description: "path for no code"}
    {parameter: "--good [good]", description: "path for good"}
    {parameter: "--bad [bad]", description: "path for bad"}

    {parameter: "--bardecode", description: "use bardecode"}
    {parameter: "--quick", description: "quickstart no db update"}
    {parameter: "-c,--cpus [cpus]", description: "how much cpus used for"}
    {parameter: "-d,--debug", description: "enable debug mode"}
  ]
  @commandShortDescription: 'start the path cluster watching service'
  @help: () ->
    """

    """
  action: (program,options) ->
    console.time('elapsed')
    #db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    @codes = []
    try
      @processlist = require(program.processlist)
    catch e
      #error 'bcocr', e

    @pathname = options.source

    @bad = path.join @pathname, 'bad'
    @goodPath = path.join @pathname, 'good'
    @noAddressPath = path.join @pathname, 'noaddress'
    @noCodePath = path.join @pathname, 'nocode'
    if program.noaddress
      @noAddressPath = program.noaddress
    if program.good
      @goodPath = program.good
    if program.nocode
      @noCodePath = program.nocode
    if program.bad
      @bad = program.bad

    @debug = false
    if program.debug
      @debug = true

    @usebardecode=false
    if program.barcode
      @usebardecode=true
    codes = []
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

    if cluster.isMaster
      cmaster = new CBcOcrMaster cluster, options.source,program.cpus,program.quick
    else
      exitfn = ()->
        process.exit()
      setTimeout exitfn, 60000
      me = @
      process.on 'message', (msg) ->
        me.filename = path.join @pathname, msg
        if not fs.existsSync(@filename)
          process.exit()
        me.zbarimg()

  zbarimg: () ->
    zb    = spawn 'zbarimg', ['-q',@filename]
    zb.stdout.on 'data', (data) => @onZBarImage(data)
    zb.stderr.on 'data', (data) => @onZBarImageError(data)

  bardecode: () ->
    if @usebardecode and @codes.length==0
      bd    = spawn 'bardecode', ['-c','8','-d','8',@filename]
      bd.stdout.on 'data', (data) => @onBarDecode(data)
      bd.stderr.on 'data', (data) => @onBarDecodeError(data)
    else
      @tesseract()

  tesseract: () ->
    if @codes.length==0
      @onNoCode()
    else
      ts    = spawn 'tesseract', ['-l','deu','-psm','1',@filename,'stdout']
      ts.on 'data', (data) => @onTesseract(data)
      ts.stdout.on 'data', (data) => @onTesseract(data)
      ts.stderr.on 'data', (data) => @onTesseractError(data)


  getZBCode: (l) ->
    p=l.split(':')
    if p.length==2
      if p[0]=='I2/5'
        p[1] = p[1].substring(0,p[1].length-1)
      return p[1]

  onZBarImage: (data) ->
    lines = data.toString().split(/\n/)
    (@codes.push(@getZBCode(line)) for line in lines when line.indexOf(':')>0)
    @bardecode()

  onZBarImageError: (data) ->
    console.log data.toString()


  getBDCode: (l) ->
    p=l.split( /\s\[/ )
    if p.length==2
      if p[1].indexOf('code25i')
        p[0] = p[0].substring(0,p[0].length-1)
      return p[0]

  onBarDecode: (data) ->
    console.log('using bardecode',data.toString())
    lines = data.toString().split(/\n/)
    (@codes.push(@getBDCode(line)) for line in lines)
    console.log('bardecode result',@codes)
    @tesseract()
  onBarDecodeError: (data) ->
    console.log data.toString()

  onTesseract: (data) ->
    ocrtext = data.toString()
    exctract = new Extract
    @adressObject = exctract.extractAddress ocrtext
    @adressObject.ocr_text = ocrtext
    @db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    if @adressObject.street == ''
      @recognizer = new Recognizer @db, @processlist
      @recognizer.setDebug @debug||false
      @recognizer.on 'error', (err) ->
        throw err
      @recognizer.on 'open', (res) => @recognizer.run(res)
      @recognizer.on 'boxes', (adrs,codes) => @onRegonizer(adrs,codes)
      @recognizer.open @filename, true
    else
      @dbfind()

  dbfind: () ->
    @db.on 'ocrhash', (rows) => @onOcrhash(rows)
    @db.on 'sortbox', (box) => @onSortbox(box)
    @db.findText [@adressObject.street,@adressObject.zipCode,@adressObject.town].join(' ')

  onRegonizer: (adrs,codes) ->
    if adrs.length>0
      @adressObject =
        name: adrs[0].name
        street: adrs[0].street
        housenumber: adrs[0].housenumber
        housenumberExtension: adrs[0].housenumberExtension
        flatNumber: adrs[0].flatNumber
        zipCode: adrs[0].zipCode
        town: adrs[0].town
        state: adrs[0].state
        message: adrs[0].message
        ocr_street: adrs[0].ocr_street
        ocr_zipCode: adrs[0].ocr_zipCode
        ocr_town: adrs[0].ocr_town
        district: adrs[0].district
      if adrs[0].box.length>0
        @box =
          strid: adrs[0].box[0].strid
          mandant: adrs[0].box[0].mandant
          regiogruppe: adrs[0].box[0].regiogruppe
          bereich: adrs[0].box[0].bereich
          sortiergang: adrs[0].box[0].sortiergang
          sortierfach: adrs[0].box[0].sortierfach
          plz: adrs[0].box[0].plz
          ort: adrs[0].box[0].ort
          ortsteil: adrs[0].box[0].ortsteil
          hnvon: adrs[0].box[0].hnvon
          hnbis: adrs[0].box[0].hnbis
          zuvon: adrs[0].box[0].zuvon
          zubis: adrs[0].box[0].zubis
          gerade: adrs[0].box[0].gerade
          ungerade: adrs[0].box[0].ungerade
          strasse: adrs[0].box[0].strasse
        @onGood()
      else
        @onNoBox()
    else
      @onNoAddress()

  onTesseractError: (data) ->
    #console.log 'onTesseractError',data.toString()
  onOcrhash: (rows) ->
    if rows.length > 0
      @db.findSortbox rows[0].ids,@adressObject.housenumber
    else
      @onNoBox()



  onSortbox: (box) ->
    if box.length==0
      @onNoBox()
    else if box.length==1
      @box =
        strid: box[0].strid
        mandant: box[0].mandant
        regiogruppe:  box[0].regiogruppe
        bereich:  box[0].bereich
        sortiergang:  box[0].sortiergang
        sortierfach:  box[0].sortierfach
        plz:  box[0].plz
        ort:  box[0].ort
        ortsteil:  box[0].ortsteil
        hnvon:  box[0].hnvon
        hnbis:  box[0].hnbis
        zuvon:  box[0].zuvon
        zubis:  box[0].zubis
        gerade:  box[0].gerade
        ungerade:  box[0].ungerade
        strasse:  box[0].strasse
      @onGood()
    else
      @onMoreBoxes()
    @db.connection.end()

  onNoCode: () ->
    console.log 'No Code'
    console.timeEnd('elapsed')
    process.exit()

  onNoAddress: () ->
    console.log 'No Address'
    console.timeEnd('elapsed')
    process.exit()

  onNoBox: () ->
    console.log 'NT'
    console.timeEnd('elapsed')
    process.exit()

  onGood: () ->
    console.log 'OK'
    console.log('onGood',@adressObject)
    console.log('onGood',@box)
    #process.send res[0]
    console.timeEnd('elapsed')
    process.exit()

  onMoreBoxes: () ->
    console.log 'unclear'
    console.timeEnd('elapsed')
    process.exit()
