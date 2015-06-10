{EventEmitter} = require 'events'
variables = require '../variables'
cv = require 'opencv'
{OCR} = require 'wocr'
Extract = require './extract'
DB = require '../classes/db'
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
  ( a.abs < b.abs )?1: ( ( a.abs > b.abs )?-1:0 )

lengthRanking = (a,b) ->
  ( a.length < b.length )?1: ( ( a.length > b.length )?-1:0 )

module.exports =
class Regonizer extends EventEmitter

  constructor: ()->

    @imageArea = 0
    @rectDebugIndex = 0
    @debug = false
    @lowThresh = parseInt variables.OCR_CANNY_THRESH_LOW
    @highThresh = parseInt variables.OCR_CANNY_THRESH_HIGH
    @nIters = parseInt variables.OCR_NITERS
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
    @db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    @db.setLimit 1
    @db.on 'error', (err) ->
      throw err


  setDebug: (mode)->
    @debug = mode
  open: (fileName)->
    me = @
    @fileName = fileName
    if @fileName
      cv.readImage @fileName, (err, im)->
        if err
          me.emit 'error', err
        else
          im.resize im.width()* parseFloat(variables.OCR_IMAGE_WIDTH_SCALE),im.height()* parseFloat(variables.OCR_IMAGE_HEIGHT_SCALE)
          me.imageArea = im.width() * im.height()
          me.original = im.clone()
          im.convertGrayscale()
          me.image = im
          me.emit 'open', true
    else
      me.emit 'error', new Error('there is no image')
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
    @original.rectangle([rect.x,rect.y],[rect.width,rect.height],color,15)
    @rectDebugIndex++
  show: (im)->
    win = new cv.NamedWindow "Debug", 0
    showImage = @original.clone()
    if typeof im!='undefined'
      showImage = im.clone()
    scale = 2
    while (showImage.width() > @maxDisplayWidth)
      showImage.resize showImage.width()/scale,showImage.height()/scale
    win.show showImage
    win.blockingWaitKey 0

  appendBarcodes: (item)->
    code = item.code
    if item.type == 'I2/5'
      code = item.code.substring(0,item.code.length-1)

    if typeof @barcodesHash[ code ] == 'undefined'
      @barcodesHash[ code ] = item.type
      @barcodes.push item.code.substring(0,item.code.length-1)

  getBarcode: (item)->
    r = item.rect
    cropped = @image.crop r.x,r.y,r.width,r.height
    xocr.SetMatrix cropped
    imagecodes = xocr.GetBarcode()
    (@appendBarcodes codes for codes in imagecodes)
  contours: (im_canny)->
    im_canny.canny @lowThresh, @highThresh
    im_canny.dilate @nIters
    if @debug
      @show im_canny
    im_canny.canny @lowThresh, @highThresh
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

  barcode: (sep)->
    if typeof @image == 'undefined'
      @emit 'error', new Error('the image is not loaded')
    im_canny = @image.copy()
    im_canny.normalize 0,255
    sorts = @contours im_canny
    sorts = @removeDoubleRect sorts
    if @debug
      (@drawRect item for item in sorts)
      @show()
    (@getBarcode item for item in sorts)
    @barcodes

  getAddress: (item)->
    adr = @extract.extractAddress item
    if adr.state
      @addresses.push adr
    adr

  getText: (item)->
    r = item.rect
    cropped = @image.crop r.x,r.y,r.width,r.height
    xocr.SetMatrix cropped
    txt = xocr.GetText()
    @texts.push txt

  text: ()->
    if typeof @image == 'undefined'
      @emit 'error', new Error('the image is not loaded')
    im_canny = @image.copy()
    im_canny.normalize 0,255
    sorts = @contours im_canny
    sorts = @removeDoubleRect sorts
    if @debug
      (@drawRect item for item in sorts)
      @show()
    (@getText item for item in sorts)
    (@getAddress item for item in @texts)
    @addresses

  checkFindSortboxCounter: ()->
    me = @
    me.findSortboxCounter--
    if me.findSortboxCounter == 0
      me.emit 'boxes', me.boxes,me.barcodes

  findSortbox: (item)->
    me = @
    searchtext = item.street+', '+item.zipCode+' '+item.town
    housenumber= item.housenumber
    @db.once 'sortbox', (res) ->
      info =
        box: res
        item: item
      me.boxes.push info
      me.checkFindSortboxCounter()
    @db.once 'ocrhash', (res) ->
      if res.length>0
        me.db.findSortbox res[0].ids, housenumber
      else
        me.checkFindSortboxCounter()
    @db.findText searchtext

  sortbox: ()->
    @text()
    @findSortboxCounter = @addresses.length+1
    @checkFindSortboxCounter()
    (@findSortbox item for item in @addresses)
