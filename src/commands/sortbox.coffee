Command = require './command'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

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
    regonizer = new Regonizer
    regonizer.setDebug program.debug||false
    regonizer.on 'error', (err) ->
      throw err
    regonizer.on 'open', (res) ->
      regonizer.sortbox()
    regonizer.on 'boxes', (res) ->
      console.log JSON.stringify(res,null,2)
      process.exit()
    regonizer.open options.filename
