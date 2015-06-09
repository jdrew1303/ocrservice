Command = require './command'
variables = require '../variables'
DB = require '../classes/db'

module.exports =
class Findtext extends Command
  @commandName: 'findtext'
  @commandArgs: ['searchtext']
  @commandShortDescription: 'query the ocr hash by a pure string'
  @help: () ->
    """

    """
  action: (options) ->
    db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST
    db.on 'error', (err) ->
      throw err
    db.on 'ocrhash', (res) ->
      console.log res
      process.exit()
    db.findText options.searchtext
