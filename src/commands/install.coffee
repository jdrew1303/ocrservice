Command = require './command'
path = require 'path'
fs = require 'fs'
os = require 'os'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

servicefiletext = """
[Unit]
Description=ocrservice

[Service]
EnvironmentFile=-/etc/sysconfig/{servicename}
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
class Install extends Command
  @commandName: 'install'
  @commandArgs: ['servicename','prefix']
  @options: [ ]
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
    servicefiletext = servicefiletext.replace /\{servicename\}/g, options.servicename
    envcontent = []
    (envcontent.push(name+'='+variables[name]) for name of variables)

    if os.platform() == 'linux'
      fs.exists '/'+path.join('etc','sysconfig',options.servicename), (exists) ->
        if exists
          console.log "a service with that name is allready installed"
        else
          fs.exists '/'+path.join('etc','systemd','system'), (exists)->
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
              fs.writeFile '/'+path.join('etc','sysconfig',options.servicename), envcontent.join("\n"), (err)->
                if err
                  throw err
                else
                  console.log """
                  the service configuration is installed on """+'/'+path.join('etc','sysconfig',options.servicename)+"""
                  """
                  fs.writeFile '/'+path.join('etc','systemd','system',options.servicename+'.service'), servicefiletext, (err)->
                    if err
                      throw err
                    else
                      console.log """
                      the service is installed.
                      you can start it with `systemctl start ocrservice`
                      or enable it to run at boot `systemctl enable ocrservice`
                      """
    else
      console.log "your platform is currently not supported"
