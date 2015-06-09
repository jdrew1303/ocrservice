
{EventEmitter} = require 'events'
mysql = require "mysql"

module.exports =
class DB extends EventEmitter
  constructor: (db_name,db_user,db_password,db_host)->
    options =
      host     : db_host
      user     : db_user
      database : db_name
      password : db_password

    @connection = mysql.createConnection options
  stop: () ->
    @connection.end()
  padLeft: (txt,length)->
    txt="0"+txt while txt.length < length
    txt
  findText: (txt,strHN) ->
    if not strHN?
      strHN = "1"
    hn_formated = (parseInt strHN)+""
    zusatz = strHN.replace hn_formated, ""
    hnFormated = @padLeft hn_formated
    txt = txt.replace ';',' '
    sql = """
    SELECT
      ocrhash.ids,
      ocrhash.adr,
      match(adr) against(?) as rel
    FROM
      ocrhash
    HAVING rel > 0
    ORDER BY rel DESC
    LIMIT 1
    """
    m = @
    @connection.query sql, [txt], (err,rows) ->
      if err
        m.emit 'error', err
      else
        m.emit 'ocrhash', rows
