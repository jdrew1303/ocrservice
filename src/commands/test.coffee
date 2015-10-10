Command = require './command'
variables = require '../variables'
Recognizer = require '../classes/recognizer'
DB = require '../classes/db'

module.exports =
class Sortbox extends Command
  @commandName: 'test'
  @commandArgs: ['filename']
  @options: [
    {parameter: "-l,--processlist [processlist]", description: "json process instruction list"},
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'testing image transformation'
  @help: () ->
    """

    """
  action: (program,options) ->
    db = new DB variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST

    try
      processlist = require(program.processlist)
    catch e

    recognizer = new Recognizer db, processlist
    recognizer.setDebug program.debug||false
    recognizer.on 'error', (err) ->
      throw err
    recognizer.on 'open', (res) ->
      recognizer.test()
    recognizer.on 'boxes', (res,codes) ->
      console.log JSON.stringify(res,null,1)
      db.connection.end()

    recognizer.open options.filename, true
