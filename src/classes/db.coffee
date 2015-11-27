
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
      connectTimeout: 120000
      acquireTimeout: 120000

    @limit = 10000
    @connection = mysql.createConnection options
    @connection.on 'error', (err) ->
      error 'DB', err
      process.exit()
    @connection.connect()
    @connection.query 'set wait_timeout=28800', [], (err,rows) ->
      console.log err
    #console.log @connection
  stop: () ->
    @connection.end()
  setLimit: (number)->
    @limit = 10000 # parseInt number
  padLeft: (txt,length)->
    txt="0"+txt while txt.length < length
    txt

  updateocrhash: () ->
    debug 'db','updateocrhash'
    sql = 'insert into ocrhash (ids,adr)
    select
      group_concat(strid separator \',\') ids,
      concat(strasse,\' \',plz,\' \',ort) adr
    from fast_access_tour
    group by ort,plz,strasse'
    @connection.query sql, [], (err,rows) => @updated(err,rows)

  updated: (err,rows) ->
    if err
      @emit 'error', err
    else
      @emit 'updated', true
  ddl: () ->
    debug 'db','ddl'
    @dropTableFastAccessTour()
  dropTableFastAccessTour: () ->
    debug 'db','drop fast_access_tour'
    @connection.query 'drop table fast_access_tour', [], (err,rows) => @dropTableOCRHash(err,rows)
  dropTableOCRHash: (err,rows) ->
    if err
      @emit 'error', err
    else
      debug 'db','drop ocrhash'
      @connection.query 'drop table ocrhash', [], (err,rows) => @createTableOCRHash(err,rows)
  createTableOCRHash: (err,rows) ->
    if err
      @emit 'error', err
    else
      debug 'db','create ocrhash'
      @connection.query 'create table ocrhash (ids varchar(255) primary key,adr text ) engine myisam', [], (err,rows) => @createFTIndexOCRHash(err,rows)
  createFTIndexOCRHash: (err,rows) ->
    if err
      @emit 'error', err
    else
      debug 'db','create fulltext index'
      @connection.query 'create fulltext index id_ft_hash on ocrhash(adr)', [], (err,rows) => @createTableFastAccessTour(err,rows)
  createTableFastAccessTour: (err,rows) ->
    if err
      @emit 'error', err
    else
      debug 'db','create fast_access_tour'
      sql = '
      CREATE TABLE `fast_access_tour` (
        `strid` int(11) DEFAULT NULL,
        `mandant` varchar(10) DEFAULT NULL,
        `regiogruppe` varchar(100) DEFAULT NULL,
        `bereich` varchar(100) DEFAULT NULL,
        `sortiergang` varchar(100) DEFAULT NULL,
        `sortierfach` varchar(100) DEFAULT NULL,
        `plz` varchar(100) DEFAULT NULL,
        `ort` varchar(100) DEFAULT NULL,
        `ortsteil` varchar(100) DEFAULT NULL,
        `hnvon` varchar(4) DEFAULT NULL,
        `hnbis` varchar(4) DEFAULT NULL,
        `zuvon` varchar(10) DEFAULT NULL,
        `zubis` varchar(10) DEFAULT NULL,
        `gerade` varchar(3) DEFAULT NULL,
        `ungerade` varchar(3) DEFAULT NULL,
        `strasse` varchar(255) DEFAULT NULL,
        KEY `idx_fat_id` (`strid`),
        KEY `idx_fat_mnd` (`mandant`),
        KEY `idx_fat_rg` (`regiogruppe`),
        KEY `idx_fat_be` (`bereich`),
        KEY `idx_fat_sf` (`sortierfach`),
        KEY `idx_fat_sg` (`sortiergang`),
        KEY `idx_fat_plz` (`plz`),
        KEY `idx_fat_str` (`strasse`)
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      '
      @connection.query sql, [], (err,rows) => @createdTableFastAccessTour(err,rows)
  createdTableFastAccessTour: (err,rows) ->
    if err
      @emit 'error', err
    else
      debug 'db', 'tables created'
      @emit 'tablescreated', true
  fastaccess: (list,index) ->
    me = @
    if typeof index == 'undefined'
      debug 'db', 'remove fast access'
      me.once 'tablescreated', (r) ->
        me.fastaccess(list,0)
      me.ddl()
    else
      if (index < list.length)
        item = list[index]
        params = [
          'strid',
          'bereich',
          'sortiergang',
          'sortierfach',
          'plz',
          'ort',
          'ortsteil',
          'hnvon',
          'hnbis',
          'zuvon',
          'zubis',
          'gerade',
          'ungerade',
          'strasse'
        ]
        p = []
        v = []
        for name in params
          p.push('?')
          v.push(item[name])
        sql = '
        insert into
          fast_access_tour
        (
          '+params.join(',')+'
        ) values (
          '+p.join(',')+'
        )'
        me.connection.query sql, v, (err,rows) ->
          if err
            m.emit 'error', err
          else
            me.fastaccess(list,index+1)
      else
        me.updateocrhash()

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
    WHERE strid in ("""+id+""")
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
