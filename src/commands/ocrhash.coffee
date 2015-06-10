Command = require './command'
variables = require '../variables'
DB = require '../classes/db'

module.exports =
class Ocrhash extends Command
  @commandName: 'ocrhash'
  @commandArgs: ['searchtext']
  @options: [
    {parameter: "-l,--limit [limit]", description: "the result limit, default is 1"}
  ]
  @commandShortDescription: 'query the ocr hash by a pure string'
  @help: () ->
    """

    """
  action: (program,options) ->

    db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    db.setLimit program.limit || 1
    db.on 'error', (err) ->
      throw err
    db.on 'ocrhash', (res) ->
      console.log res
      process.exit()
    db.findText options.searchtext
