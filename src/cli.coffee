{spawn} = require 'child_process'
path = require 'path'
colors = require 'colors'
program = require 'commander'
commandList = require('./reqall')('./commands','.js')
pck = require '../package.json'
commands = []
(commands.push(require('./commands/'+path.basename(name))) for name in commandList when name!='command.js')
program.version pck.version

module.exports.main = (cmdName) ->
  if cmdName?
    cmd = null
    for command in commands
      if command.commandName == cmdName
        cmd = command
    if cmd?
      (program.option(op.parameter,op.description) for op in cmd.options)
      opts = []
      (opts.push('<'+op+'>') for op in cmd.commandArgs)
      if opts.length==0
        c = new cmd()
        c.action(program)
      else
        program.arguments(opts.join(' ')).action  (a0,a1,a2,a3,a4,a5) ->
          arg = {}
          index = 0
          for name in cmd.commandArgs
            if index == 0
              arg[name]= a0
            if index == 1
              arg[name]= a1
            if index == 2
              arg[name]= a2
            if index == 3
              arg[name]= a3
            if index == 4
              arg[name]= a4
            if index == 5
              arg[name]= a5
            index++
          c = new cmd()
          c.action program,arg
        program.on '--help', () ->
          console.log cmd.help()
          console.log ""
  else
    for command in commands
      opts = []
      (opts.push('<'+op+'>') for op in command.commandArgs)
      cmdL = [command.commandName].concat( opts )
      program.command(cmdL.join(' '),command.commandShortDescription)
  program.parse process.argv
