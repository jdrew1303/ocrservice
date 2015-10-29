{EventEmitter} = require 'events'
variables = require '../variables'
cv = require 'opencv'
{OCR} = require 'wocr'
Extract = require './extract'
DB = require '../classes/db'
child_process = require 'child_process'
spawn = child_process.spawn

xocr = new OCR()
xocr.Init variables.OCR_LANGUAGE

colorList = [
  [0, 255, 0],
  [255, 255, 255],
  [0, 0, 255],
  [0, 255, 255],
  [255, 255, 10],
  [100, 255, 255],
  [100, 155, 255],
  [100, 155, 155]
]
contourRanking = (a,b) ->
  if a.abs > b.abs
    1
  else if a.abs < b.abs
    -1
  else
    0

  #( a.abs < b.abs )?1: ( ( a.abs > b.abs )?-1:0 )

lengthRanking = (a,b) ->
  if a.length < b.length
    1
  else if a.length > b.length
    -1
  else
    0
  #  ( a.length < b.length )?1: ( ( a.length > b.length )?-1:0 )

module.exports =
class Recognizer extends EventEmitter

  constructor: (db, process_list)->
    @showCounter=0
    @imageArea = 0
    @rectDebugIndex = 0
    @debug = false

    @relativeAreaMinimum = parseFloat variables.OCR_RELATIVEAREAMINIMUM
    @relativeAreaMaximum = parseFloat variables.OCR_RELATIVEAREAMAXIMUM
    @codeBlockRatio = parseFloat variables.OCR_CODE_BLOCK_RATIO
    @maxDisplayWidth = 600
    @barcodes = []
    @barcodesHash = {}
    @texts = []
    @addresses = []
    @boxes = []
    @extract = new Extract

    if typeof db!='undefined'
      @db = db
    else
      @db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
      @db.setLimit 100
      @db.on 'error', (err) ->
        throw err

    if typeof process_list=='undefined'
      console.log 'CWatcherClient','there was no processlist given !'


    if typeof process_list=='undefined'
      @process_list = []
      proc =
        method: 'getText_M2'
        OCR_CROPPED_TEXT_THRESHOLD_MIN: 10
        OCR_CROPPED_TEXT_THRESHOLD_MAX: 50
        OCR_TEXT_MIN_NORMALIZE: variables.OCR_TEXT_MIN_NORMALIZE
        OCR_TEXT_MAX_NORMALIZE: 255
        OCR_TEXT_CANNY_THRESH_LOW: variables.OCR_TEXT_CANNY_THRESH_LOW
        OCR_TEXT_CANNY_THRESH_HIGH: variables.OCR_TEXT_CANNY_THRESH_HIGH
        OCR_TEXT_NITERS: variables.OCR_TEXT_NITERS
      @process_list.push proc

      proc =
        method: 'getText_M2'
        OCR_CROPPED_TEXT_THRESHOLD_MIN: 60
        OCR_CROPPED_TEXT_THRESHOLD_MAX: 90
        OCR_TEXT_MIN_NORMALIZE: variables.OCR_TEXT_MIN_NORMALIZE
        OCR_TEXT_MAX_NORMALIZE: 255
        OCR_TEXT_CANNY_THRESH_LOW: variables.OCR_TEXT_CANNY_THRESH_LOW
        OCR_TEXT_CANNY_THRESH_HIGH: variables.OCR_TEXT_CANNY_THRESH_HIGH
        OCR_TEXT_NITERS: variables.OCR_TEXT_NITERS
      @process_list.push proc
    else
      @process_list = process_list


  setDebug: (mode)->
    @debug = mode

  free: () ->

    @original = null
    @barcode_image = null
    @image = null

  open: (fileName,brightness)->
    debug 'open', fileName+' #'+brightness

    me = @
    @brightness=false
    if typeof brightness == 'undefined'
      @brightness=true
    @fileName = fileName
    if @fileName
      cv.readImage @fileName, @imageReaded.bind(@)
    else
      me.emit 'error', new Error('there is no image')
  test: () ->

    im= @original.clone()
    @processList()

  imageReaded: (err,im) ->
    me = @
    if err
      me.emit 'error', err
    else
      @im = im
      @imageReadedNextTick()

  imageReadedNextTick: () ->
    me = @
    im = @im
    if im.width()==0
      me.emit 'error', 'zero size'
    else
      im.shearing 1,0,0,  0.06,1,0
      im.resize im.width()* parseFloat(variables.OCR_IMAGE_WIDTH_SCALE),im.height()* parseFloat(variables.OCR_IMAGE_HEIGHT_SCALE)
      me.imageArea = im.width() * im.height()
      me.original = im.clone()

      me.barcode_image = im.clone()
      me.barcode_image.convertGrayscale()
      me.image = im.clone()

      if @brightness == true
        debug 'brightness', ''
        me.image.brightness  parseFloat(variables.OCR_IMAGE_CONTRAST), parseInt(variables.OCR_IMAGE_BIGHTNESS)
      me.image.convertGrayscale()

      im=null
      me.emit 'open', true

  removeDoubleRect: (sorts)->
    result=[]
    lastrect = ""
    i = sorts.length-1
    while i>-1
      if ( JSON.stringify(sorts[i].rect,null,0) == lastrect )
      else
        result.push(sorts[i])
      lastrect = JSON.stringify(sorts[i].rect,null,0)
      i--
    result.reverse()

  drawRect: (item)->
    i = @rectDebugIndex%colorList.length
    color = colorList[i]
    rect  = item.rect
    @contourImage.rectangle([rect.x,rect.y],[rect.width,rect.height],color,15)
    @rectDebugIndex++


  show: (im)->
    if parseInt(variables.OCR_DEBUG_WINDOW)==1
      win = new cv.NamedWindow "Debug"+(@showCounter++), 0
      showImage = im.clone()
      scale = 2

      while (showImage.width() > @maxDisplayWidth)
        showImage.resize showImage.width()/scale,showImage.height()/scale
      win.show showImage
      win.blockingWaitKey parseInt(variables.OCR_DEBUG_WINDOW_TIMEOUT)

  outerbounding: ()->
    bound_image = @image.clone()
    result =
      x: 0
      y: 0
      width: bound_image.width()
      height: bound_image.height()

    area = result.width * result.height
    last_area = 0
    bound_image.canny 0, 100
    if @debug
      @show bound_image

    bound_image.findContours()
    i=0
    contours = bound_image.findContours()
    while i < contours.size()
      rect = contours.boundingRect i
      rect_area = rect.width * rect.height
      if rect_area / area > 0.2
        if rect_area>last_area
          result = rect
          last_area = rect_area
      i++

    result


  appendBarcodes: (item)->
    code = item.code
    if code.indexOf('http://')==-1
      if item.type == 'I2/5'
        code = item.code.substring(0,item.code.length-1)

      if typeof @barcodesHash[ code ] == 'undefined'
        @barcodesHash[ code ] = item.type
        @barcodes.push item.code.substring(0,item.code.length-1)

  getBarcode: (item)->
    r = item.rect
    cropped = @image.crop r.x,r.y,r.width,r.height
    #cropped = cropped.threshold 40,90
    #cropped.equalizeHist()


    xocr.SetMatrix cropped
    if @debug
      @show cropped
    imagecodes = xocr.GetBarcode()
    (@appendBarcodes codes for codes in imagecodes)
    xocr.free()

  contours: (im_canny,lowThresh,highThresh,nIters)->

    im_canny.canny lowThresh, highThresh
    if @debug
      @show im_canny
    im_canny.dilate nIters
    if @debug
      @show im_canny
    im_canny.canny lowThresh, highThresh
    if @debug
      @show im_canny

    contours = im_canny.findContours()
    sorts = []
    i = 0
    while i < contours.size()
      rect = contours.boundingRect i
      relativeArea = rect.width*rect.height/@imageArea
      if relativeArea > @relativeAreaMinimum and
         relativeArea < @relativeAreaMaximum
        data =
          index: i
          rect: rect
          area: rect.width*rect.height
          relativeArea: relativeArea
          ratio: Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height)
          abs: Math.abs( Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height) - @codeBlockRatio )
        sorts.push data

      i++
    sorts.sort contourRanking
  barcodeOriginal: (cb)->
    me = @
    codes = []
    console.log @fileName
    child = spawn('zbarimg',[@fileName])
    child.stdout.on 'data', (data) ->
      codeparts = data.toString().replace(/\n/,'').split(':')
      if codeparts.length==2
        codes.push codeparts[1]
    child.stderr.on 'data', (data) ->
      console.log data.toString()
    child.on 'exit', (code) ->
      me.barcodes = codes
      cb codes

  barcode: (sep)->
    if typeof @barcode_image == 'undefined'
      @emit 'error', new Error('the image is not loaded')
    im_canny = @barcode_image.copy()
    im_canny.normalize parseInt(variables.OCR_BC_MIN_NORMALIZE),255
    @contourImage = @original.clone()
    sorts = @contours im_canny, parseInt(variables.OCR_BC_CANNY_THRESH_LOW), parseInt(variables.OCR_BC_CANNY_THRESH_HIGH), parseInt( variables.OCR_BC_NITERS )
    sorts = @removeDoubleRect sorts
    #if @debug
    #  (@drawRect item for item in sorts)
    #  @show(@contourImage)
    (@getBarcode item for item in sorts)

    if @barcodes.length==0
      xocr.SetMatrix @barcode_image
      imagecodes = xocr.GetBarcode()
      console.log 'imagecodes',imagecodes
      (@appendBarcodes codes for codes in imagecodes)
      xocr.free()

    @barcodes.sort lengthRanking
    @barcodes

  getAddress: (item,force)->
    adr = @extract.extractAddress item,force
    if adr.state
      @addresses.push adr
    adr

  getText_M1: (item,config)->
    if typeof config=='undefined'
      config=@process_list[0]
    r = item.rect
    cropped = @image.crop r.x,r.y,r.width,r.height
    cropped.normalize parseInt(config.OCR_CROPPED_TEXT_MIN_NORMALIZE),parseInt(config.OCR_CROPPED_TEXT_MAX_NORMALIZE)
    cropped.brightness  parseFloat(config.OCR_CROPPED_TEXT_CONTRAST), parseInt(config.OCR_CROPPED_TEXT_BIGHTNESS)
    if @debug
      @show cropped

    xocr.SetMatrix cropped
    if @debug
      @show cropped
    txt = xocr.GetText()
    xocr.free()

    cropped = null
    @texts.push txt


  getText: (item,config)->
    if typeof config=='undefined'
      config=@process_list[0]
    r = item.rect
    cropped = @image.crop r.x,r.y,r.width,r.height
    cropped = cropped.threshold parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MIN), parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MAX)
    cropped.equalizeHist()

    if @debug
      @show cropped


    xocr.SetMatrix cropped
    if @debug
      @show cropped
    txt = xocr.GetText()
    xocr.free()
    cropped = null
    @texts.push txt

  getText_M2: (item,config)->
    if typeof config=='undefined'
      config=@process_list[0]
    r = item.rect
    cropped = @image.crop r.x,r.y,r.width,r.height

    #win = new cv.NamedWindow "CroppedDebug", 0
    #showImage = cropped.clone()
    #scale = 2
    #win.show showImage
    #win.blockingWaitKey 1000

    cropped = cropped.threshold parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MIN), parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MAX)
    cropped.equalizeHist()
    mean = cropped.meanStdDev().mean.pixel(0,0)
    stddev = cropped.meanStdDev().stddev.pixel(0,0)


    #if stddev < 200 and mean < stddev
    #  info 'getText_M2','skipped stddev lower than 200'
    #  return

    if mean==0 and stddev==0
      info 'getText_M2','skipped mean and stddev = 0'
      return
    if @debug
      @show cropped


    cropped.rotate config.OCR_CROPPED_ROTATION || 0

    xocr.SetMatrix cropped
    if @debug
      @show cropped
    txt = xocr.GetText()
    xocr.free()
    if false
      cropped.rotate -90

      xocr.SetMatrix cropped
      if @debug
        @show cropped
      txt = xocr.GetText()
      xocr.free()
      cropped.rotate -90

      xocr.SetMatrix cropped
      if @debug
        @show cropped
      txt = xocr.GetText()
      xocr.free()
      cropped.rotate -90

      xocr.SetMatrix cropped
      if @debug
        @show cropped
      txt = xocr.GetText()
      xocr.free()

    cropped = null
    @texts.push txt

  text: ()->
    if typeof @image == 'undefined'
      @emit 'error', new Error('the image is not loaded')

    im_canny = @image.copy()
    im_canny.normalize parseInt(variables.OCR_TEXT_MIN_NORMALIZE),255
    @contourImage = @original.clone()
    sorts = @contours im_canny, parseInt(variables.OCR_TEXT_CANNY_THRESH_LOW), parseInt(variables.OCR_TEXT_CANNY_THRESH_HIGH),parseInt( variables.OCR_TEXT_NITERS )
    sorts = @removeDoubleRect sorts
    if @debug
      (@drawRect item for item in sorts)
      @show(@contourImage)
    if parseInt(variables.OCR_TEXT_METHOD)==0
      (@getText_M1(item,variables) for item in sorts)
    if parseInt(variables.OCR_TEXT_METHOD)==1
      (@getText(item,variables) for item in sorts)
    if parseInt(variables.OCR_TEXT_METHOD)==2
      (@getText_M2(item,variables) for item in sorts)
    (@getAddress item for item in @texts)
    @addresses

  textMethod: (methodConfig)->
    if typeof @image == 'undefined'
      @emit 'error', new Error('the image is not loaded')
    im_canny = @image.copy()

    if typeof methodConfig.OCR_TEXT_MIN_NORMALIZE=='number'
      if typeof methodConfig.OCR_TEXT_MAX_NORMALIZE=='number'
        im_canny.normalize parseInt(methodConfig.OCR_TEXT_MIN_NORMALIZE),parseInt(methodConfig.OCR_TEXT_MAX_NORMALIZE)

    @contourImage = @original.clone()
    sorts = @contours im_canny, parseInt(methodConfig.OCR_TEXT_CANNY_THRESH_LOW), parseInt(methodConfig.OCR_TEXT_CANNY_THRESH_HIGH),parseInt( methodConfig.OCR_TEXT_NITERS )
    sorts = @removeDoubleRect sorts
    if @debug
      (@drawRect item for item in sorts)
      @show(@contourImage)

    (@[methodConfig.method](item,methodConfig) for item in sorts)
    (@getAddress item for item in @texts)
    @addresses

  processList: (index) ->
    if typeof index=='undefined'
      index=-1
    if index==-1
      @barcode()

      if @barcodes.length==0
        fn=(codes)->
          @barcodes = codes
          @processList index+1
        @barcodeOriginal fn.bind(@)
      else
        @processList index+1
    else if index >= @process_list.length
      @emit 'boxes', [], @barcodes
    else
      console.log 'processList', index ,@process_list.length , @process_list[index]
      @textMethod @process_list[index]
      @once 'internalboxes', (res,codes) ->
        if typeof res!='undefined' and res.length > 0 and typeof res[0].box!='undefined' and res[0].box.length == 1
          @emit 'boxes',res,codes
        else
          @processList index+1
      @sortboxAfterText()



  reduceResult: ()->
    me = @
    result = []
    resHash = []
    for address in me.addresses
      c = JSON.stringify address.box,null,0
      if resHash.indexOf(c)==-1
        result.push address
        resHash.push c
    result

  fixResult: (res,codes)->
    result = []
    for item in res
      item.codes = codes
      item.ocr_street = item.street
      item.ocr_zipCode = item.zipCode
      item.ocr_town = item.town

      if typeof item.box!='undefined' and item.box.length > 0
        item.street = item.box[0].strasse
        item.zipCode = item.box[0].plz
        item.town = item.box[0].ort
        item.district = item.box[0].ortsteil

      result.push item
    result

  checkFindSortboxCounter: ()->
    me = @
    me.findSortboxCounter--
    if me.findSortboxCounter == 0
      me.emit 'internalboxes', me.fixResult(me.reduceResult(),me.barcodes) ,me.barcodes

  findSortbox: (item)->
    me = @
    searchtext = item.street+', '+item.zipCode+' '+item.town
    housenumber= item.housenumber
    @db.once 'sortbox', (res) ->
      item.box = res
      me.checkFindSortboxCounter()
    @db.once 'ocrhash', (res) ->
      if res.length>0
        me.db.findSortbox res[0].ids, housenumber
      else
        me.checkFindSortboxCounter()
    @db.findText searchtext

  sortbox: ()->
    #@text()
    #@sortboxAfterText()
    @processList()

  sortboxAfterText: ()->
    @findSortboxCounter = @addresses.length+1
    @checkFindSortboxCounter()
    (@findSortbox item for item in @addresses)
