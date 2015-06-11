Command = require './command'
path = require 'path'
fs = require 'fs'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

servicefiletext = """
[Unit]
Description=ocrservice

[Service]
EnvironmentFile=-/etc/sysconfig/ocrservice
ExecStart={cwd}bin/ocrservice watch {prefix}
Restart=always
User=nobody
Group=nobody
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
WorkingDirectory={cwd}

[Install]
WantedBy=multi-user.target
"""

module.exports =
class Installservice extends Command
  @commandName: 'installservice'
  @commandArgs: ['prefix']
  @options: [
  ]
  @commandShortDescription: 'install this the systemd service'
  @help: () ->
    """

    """
  action: (program,options) ->
    paths = process.mainModule.filename.split(path.sep)
    paths.pop()
    paths.pop()
    servicefiletext = servicefiletext.replace /\{cwd\}/g, paths.join(path.sep)
    servicefiletext = servicefiletext.replace /\{prefix\}/g, options.prefix
    envcontent = []
    (envcontent.push(name+'='+variables[name]) for name of variables)

    fs.exists path.join('etc','systemd','system'), (exists)->
      if not exists
        console.log "it seem you don't have systemd installed"
        console.log "but your service file should look like:"
        console.log ""
        console.log servicefiletext
        console.log ""
        console.log ""
        console.log "environment file should look like:"
        console.log ""
        console.log envcontent.join("\n")

      else


        fs.writeFile path.join('etc','sysconfig','ocrservice'), envcontent.join("\n"), (err)->
          if err
            throw err
          else
            console.log """
            the service configuration is installed on """+path.join('etc','sysconfig','ocrservice')+"""
            """
            fs.writeFile path.join('etc','systemd','system','ocrservice.service'), servicefiletext, (err)->
              if err
                throw err
              else
                console.log """
                the service is installed.
                you can start it with `systemctl start ocrservice`
                or enable it to run at boot `systemctl enable ocrservice`
                """
