child_process = require 'child_process'

module.exports =
class Command
  @commandArgs: []
  @help: () ->
    """
    """
  action: (options) ->
    console.log options
  spawn: (cmd,args,remaining...) ->
    options = remaining.shift() if remaining.length >= 2
    callback = remaining.shift()
    child = child_process.spawn(command, args, options)
    errorChunks = []
    outputChunks = []

    child.stdout.on 'data', (chunk) ->
      if options?.streaming
        process.stdout.write chunk
      else
        outputChunks.push(chunk)

    child.stderr.on 'data', (chunk) ->
      if options?.streaming
        process.stderr.write chunk
      else
        errorChunks.push(chunk)

    child.on 'error', (error) ->
      callback error, Buffer.concat(errorChunks).toString(), Buffer.concat(outputChunks).toString()
    child.on 'close', (code) ->
      callback code, Buffer.concat(errorChunks).toString(), Buffer.concat(outputChunks).toString()
