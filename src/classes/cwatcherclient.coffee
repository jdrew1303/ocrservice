{EventEmitter} = require 'events'
path = require 'path'
fs = require 'fs'
variables = require '../variables'
DB = require './db'
Recognizer = require './recognizer'

module.exports =
class CWatcherClient extends EventEmitter
  constructor: (cluster, pathName, filename, processlist)->
    @cluster = cluster
    @pathname = pathName
    @filename = filename
    @processlist = processlist
    console.log(@pathname,@filename)
    if typeof @processlist=='undefined'
      console.log 'CWatcherClient','there was no processlist given!'

    @setBadPath path.join(@pathname, 'bad')
    @setGoodPath path.join(@pathname, 'good')
    @setNoAddressPath path.join(@pathname, 'noaddress')
    @setNoCodePath path.join(@pathname, 'nocode')

    me = @
    @db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    @db.setLimit 100
    @db.on 'updated', (num) => @onDBUpdated(num)
    @db.on 'error', (err) ->
      me.emit 'error', err.code
      me.emit 'stoped'
    @scan()

  setNoCodePath: (path) ->
    @nocodePath = path
  setGoodPath: (path) ->
    @goodPath = path
  setNoAddressPath: (path) ->
    @noaddressPath = path
  setBadPath: (path) ->
    @badPath = path

  scan: () ->
    me=@
    file = path.join(me.pathname, me.filename)
    fs.stat file, (err,stat) ->
      if err
        me.emit 'stoped'
      else
        me.current_stat = stat
        now = new Date
        now.setSeconds now.getSeconds() - 1
        if stat.ctime < now
          me.recognizer = new Recognizer me.db, me.processlist
          me.recognizer.setDebug me.debug
          me.recognizer.on 'error', (err) ->
            fs.writeFile path.join(me.badPath,me.filename+'.txt'), JSON.stringify(err,null,2) , (err) ->
              if err
                me.emit 'error', err
              fs.rename file, path.join(me.badPath,me.filename), (err) ->
                if err
                  me.emit 'error', err
                me.emit 'stoped'
          me.recognizer.on 'open', (res) ->
            me.recognizer.barcode()
            me.recognizer.sortbox()
          me.recognizer.on 'boxes', (res,codes) ->
            if codes.length == 0
              me.fullScann codes, 'nocode'
            else
              if res.length == 0 or typeof res[0].box == 'undefined' or res[0].box.length==0
                me.fullScann(codes,'noaddress')
              else if res.length == 1
                name = res[0].codes.join('.')
                try
                  fs.unlinkSync path.join(me.goodPath,name+path.extname(file))
                catch e

                fs.rename file, path.join(me.goodPath,name+path.extname(file)), (err) ->
                  debug 'good move',file+'->'+path.join(me.noaddressPath,name+path.extname(file))
                  if err
                    me.emit 'error', err
                    me.emit 'stoped'
                  else
                    debug 'put', res
                    process.send res[0] # sending good data
                    me.emit 'stoped'

            #me.recognizeBoxes(res,codes)
          me.recognizer.open path.join(me.pathname, me.filename)
        else
          debug 'CWatcherClient','file too young'
          me.emit 'stoped'
  fullScann: (codes,failpath) ->
    me = @
    file = path.join(me.pathname, me.filename)
    debug 'fullscann', file,'failpath',failpath
    @recognizer = new Recognizer me.db, me.processlist
    @recognizer.setDebug false
    @recognizer.on 'error', (err) ->
      #error 'CWatcherClient','noAddress'+codes.join(';')
      me.emit 'stoped'
    @recognizer.on 'open', (res) ->

      me.recognizer.barcodeOriginal (codes) ->
        r = me.recognizer.outerbounding()
        item =
          rect: r

        me.recognizer.getText item
        data =
          codes: codes
        data.txt = me.recognizer.texts
        data.zipCode = ""
        data.town = ""
        data.street = ""
        data.housenumber = ""
        data.housenumberExtension = ""
        if data.txt.length>0
          adr = me.recognizer.getAddress data.txt[0], true
          data.adr = adr
          data.zipCode = adr.zipCode
          data.town = adr.town
          data.street = adr.street
          data.housenumber = adr.housenumber
          data.housenumberExtension = adr.housenumberExtension
        #debug 'sortboxAfterText', data
        me.recognizer.addresses.push data
        me.recognizer.sortboxAfterText()

    @recognizer.once 'boxes', (boxes,codes) ->
      name = codes.join('.')
      if boxes.length>0 and codes.length>0 and boxes[0].box?.length>0
        boxes[0].codes = codes
        try
          fs.unlinkSync path.join(me.goodPath,name+path.extname(file))
        catch e

        fs.rename file, path.join(me.goodPath,name+path.extname(file)), (err) ->
          debug 'good* move',file+'->'+path.join(me.noaddressPath,name+path.extname(file))
          if err
            me.emit 'error', err
          else
            process.send boxes[0] # sending good fullscann result
          me.emit 'stoped'
      else
        if failpath=='nocode'
          name = (new Date()).getTime()
          try
            fs.unlinkSync path.join(me.nocodePath,name+path.extname(file))
          catch e

          fs.rename file, path.join(me.nocodePath,name+path.extname(file)), (err) ->
            debug failpath+' move',file+'->'+path.join(me.noaddressPath,name+path.extname(file))
            if err
              me.emit 'error', err
            me.emit 'stoped'
        else
          try
            fs.unlinkSync path.join(me.noaddressPath,name+path.extname(file))
          catch e

          fs.rename file, path.join(me.noaddressPath,name+path.extname(file)), (err) ->
            debug failpath+' move',file+'->'+path.join(me.noaddressPath,name+path.extname(file))
            if err
              me.emit 'error', err
            else
              box =
                sortiergang: 'NA'
                sortierfach: 'NA'
                strid: -1
                mandant: null
                regiogruppe: null
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
              process.send item
              console.log 'noaddress',boxes
            me.emit 'stoped'
    @recognizer.open file, false
