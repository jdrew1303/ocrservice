Command = require './command'
variables = require '../variables'
Recognizer = require '../classes/recognizer'

module.exports =
class Sortbox extends Command
  @commandName: 'sortbox'
  @commandArgs: ['filename']
  @options: [
    {parameter: "-d,--debug", description: "enable debug mode"},
  ]
  @commandShortDescription: 'extract the sortboxes from a given image file'
  @help: () ->
    """

    """
  action: (program,options) ->
    recognizer = new Recognizer
    recognizer.setDebug program.debug||false
    recognizer.on 'error', (err) ->
      throw err
    recognizer.on 'open', (res) ->
      recognizer.sortbox()
    recognizer.on 'boxes', (res) ->
      console.log JSON.stringify(res,null,2)
      process.exit()
    recognizer.open options.filename
