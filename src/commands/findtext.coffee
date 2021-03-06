Command = require './command'
variables = require '../variables'
DB = require '../classes/db'

module.exports =
class Findtext extends Command
  @commandName: 'findtext'
  @commandArgs: ['searchtext','housenumber']

  @options: [
    {parameter: "-l,--limit [limit]", description: "the result limit, default is 1"}
  ]
  @commandShortDescription: 'retrieving the sort information bx string and housenumber'
  @help: () ->
    """

    """
  action: (program,options) ->
    db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    db.setLimit program.limit || 1
    db.on 'error', (err) ->
      throw err
    db.on 'sortbox', (res) ->
      console.log res
      process.exit()
    db.on 'ocrhash', (res) ->
      if res.length>0
        db.findSortbox res[0].ids, options.housenumber
      else
        console.log "no matches"
        process.exit()
    db.findText options.searchtext
