{EventEmitter} = require 'events'
path = require 'path'
fs = require 'fs'
glob = require 'glob'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

# watching a directory for new files
module.exports =
class Watcher extends EventEmitter
  constructor: (pathName)->
    @intervalTimeout = 1000
    @debug = false

    #regonizer.setDebug program.debug||false


    if not pathName
      throw new Error('you must give a path name')
    @pathName = pathName
    me = @
    fs.exists @pathName, (exists)->

      if not exists
        throw new Error 'the directory does not exists ' + me.pathName

      else

        me.createPath 'good'
        me.createPath 'unclear'
        me.createPath 'nocode'
        me.createPath 'noaddress'
        me.createPath 'bad'

        me.emit 'running', true
        me.watch()

  createPath: (name)->

    me = @
    fs.exists path.join(me.pathName, name), (exists)->
      if not exists
        fs.mkdir path.join(me.pathName, name), (error)->
          if error
            me.emit 'error',err

  setDebug: (mode)->

    @debug = mode

  watch: ()->
    me = @
    options =
      cwd: me.pathName
    pattern = variables.OCR_WATCH_PATTERN
    glob pattern, options, (err,matches) ->
      if err
        me.emit 'error',err
      else
        me.runList.bind(me) matches, 0

  checkFile: (file,callback) ->
    me = @
    fs.stat file, (err,stat) ->
      now = new Date
      now.setSeconds now.getSeconds() - 10
      if stat.ctime < now
        regonizer = new Regonizer
        regonizer.once 'error', (err) ->
          throw err
        regonizer.once 'open', (res) ->

          regonizer.barcode()
          regonizer.sortbox()
        regonizer.once 'boxes', (res,codes) ->

          if res.length == 0
            if codes.length == 0
              #no code, and address
              name = stat.ctime.getTime()
              fs.rename file, path.join(me.pathName, 'nocode', name+path.extname(file)), (err) ->
                if err
                  me.emit 'error', err
            else
              #no address
              name = codes.join('.')
              fs.rename file, path.join(me.pathName, 'noaddress', name+path.extname(file)), (err) ->
                if err
                  me.emit 'error', err
          else
            name = codes.join('.')
            fs.rename file, path.join(me.pathName, 'good', name+path.extname(file)), (err) ->
              if err
                me.emit 'error', err
          console.log JSON.stringify(res,null,2),codes
          callback err
        regonizer.open file
      else
        setTimeout me.checkFile( file, callback ), 1000

  runList: (list,index) ->
    me = @
    if index == list.length
      setTimeout me.watch.bind(me), me.intervalTimeout
    else
      me.checkFile path.join(me.pathName, list[index]), (error) ->
        if error
          me.emit 'error',error
        else
          me.runList(list,index+1)
