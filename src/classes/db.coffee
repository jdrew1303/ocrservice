
{EventEmitter} = require 'events'
mysql = require "mysql"

distanceRanking = (a,b) ->
  if a.distance < b.distance
    -1
  else if a.distance > b.distance
    1
  else
    0


module.exports =
class DB extends EventEmitter
  constructor: (db_name,db_user,db_password,db_host)->
    options =
      host     : db_host
      user     : db_user
      database : db_name
      password : db_password
    @limit = 10000
    @connection = mysql.createConnection options
  stop: () ->
    @connection.end()
  setLimit: (number)->
    @limit = 10000 # parseInt number
  padLeft: (txt,length)->
    txt="0"+txt while txt.length < length
    txt
  findText: (txt) ->
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
    LIMIT """+@limit+"""
    """
    m = @
    @connection.query sql, [txt], (err,rows) ->
      if err
        m.emit 'error', err
      else
        (row.distance = m.getEditDistance(row.adr,txt) for row in rows)

        rows.sort distanceRanking
        #console.log rows
        m.emit 'ocrhash', rows


  getEditDistance: (a,b)->
    if a.length == 0
      b.length
    if b.length == 0
      a.length
    matrix = []
    for i in [0..b.length]
      matrix[i] = [i]
    for j in [0..a.length]
      matrix[0][j] = j

    for i in [1..b.length]
      for j in [1..a.length]
        if b.charAt(i-1) == a.charAt(j-1)
          matrix[i][j] = matrix[i-1][j-1]
        else
          matrix[i][j] = Math.min(matrix[i-1][j-1] + 1,  Math.min(matrix[i][j-1] + 1,  matrix[i-1][j] + 1))

    matrix[b.length][a.length]

  findSortbox: (id,hn)->
    hn_formated = (parseInt hn)+""
    evenopt = (parseInt hn)%2 == 0
    zusatz = hn.replace hn_formated, ""
    hnFormated = @padLeft hn_formated,4

    sql = """
    SELECT
      *
    FROM
    fast_access_tour
    WHERE strid in ("""+id+""") and regiogruppe='Zustellung'
    """

    m = @
    @connection.query sql, (err,rows) ->
      if err
        m.emit 'error', err
      else
        even = []
        odd = []
        (even.push(row) for row in rows when parseInt(row.hnvon)<=parseInt(hnFormated) and parseInt(row.hnbis)>=parseInt(hnFormated) and row.gerade=='1')
        (odd.push(row) for row in rows when parseInt(row.hnvon)<=parseInt(hnFormated) and parseInt(row.hnbis)>=parseInt(hnFormated) and row.ungerade=='1')
        if evenopt
          m.emit 'sortbox', even
        else
          m.emit 'sortbox', odd
