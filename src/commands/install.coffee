Command = require './command'
path = require 'path'
fs = require 'fs'
os = require 'os'
variables = require '../variables'
Regonizer = require '../classes/regonizer'

servicefiletext = """
[Unit]
Description={servicename}

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
Alias={servicename}.service
"""

initdfile = """
#!/bin/sh

NODE_ENV="production"
APP_DIR="{cwd}"
NODE_APP="bin/ocrservice watch {prefix}"
CONFIG_DIR="$APP_DIR"
PID_DIR="$APP_DIR/pid"
PID_FILE="$PID_DIR/app.pid"
LOG_DIR="$APP_DIR/log"
LOG_FILE="$LOG_DIR/app.log"
NODE_EXEC=$(which node)

###############

# REDHAT chkconfig header

# chkconfig: - 58 74
# description: node-app is the script for starting a node app on boot.
### BEGIN INIT INFO
# Provides: node
# Required-Start:    $network $remote_fs $local_fs
# Required-Stop:     $network $remote_fs $local_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: start and stop node
# Description: Node process for app
### END INIT INFO

###############

USAGE="Usage: $0 {start|stop|restart|status} [--force]"
FORCE_OP=false

pid_file_exists() {
    [ -f "$PID_FILE" ]
}

get_pid() {
    echo "$(cat "$PID_FILE")"
}

is_running() {
    PID=$(get_pid)
    ! [ -z "$(ps aux | awk '{print $2}' | grep "^$PID$")" ]
}

start_it() {
    mkdir -p "$PID_DIR"
    mkdir -p "$LOG_DIR"

    echo "Starting node app ..."
    {vars} NODE_ENV="$NODE_ENV" NODE_CONFIG_DIR="$CONFIG_DIR" $NODE_EXEC "$APP_DIR/$NODE_APP"  1>"$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Node app started with pid $!"
}

stop_process() {
    PID=$(get_pid)
    echo "Killing process $PID"
    kill $PID
}

remove_pid_file() {
    echo "Removing pid file"
    rm -f "$PID_FILE"
}

start_app() {
    if pid_file_exists
    then
        if is_running
        then
            PID=$(get_pid)
            echo "Node app already running with pid $PID"
            exit 1
        else
            echo "Node app stopped, but pid file exists"
            if [ $FORCE_OP = true ]
            then
                echo "Forcing start anyways"
                remove_pid_file
                start_it
            fi
        fi
    else
        start_it
    fi
}

stop_app() {
    if pid_file_exists
    then
        if is_running
        then
            echo "Stopping node app ..."
            stop_process
            remove_pid_file
            echo "Node app stopped"
        else
            echo "Node app already stopped, but pid file exists"
            if [ $FORCE_OP = true ]
            then
                echo "Forcing stop anyways ..."
                remove_pid_file
                echo "Node app stopped"
            else
                exit 1
            fi
        fi
    else
        echo "Node app already stopped, pid file does not exist"
        exit 1
    fi
}

status_app() {
    if pid_file_exists
    then
        if is_running
        then
            PID=$(get_pid)
            echo "Node app running with pid $PID"
        else
            echo "Node app stopped, but pid file exists"
        fi
    else
        echo "Node app stopped"
    fi
}

case "$2" in
    --force)
        FORCE_OP=true
    ;;

    "")
    ;;

    *)
        echo $USAGE
        exit 1
    ;;
esac

case "$1" in
    start)
        start_app
    ;;

    stop)
        stop_app
    ;;

    restart)
        stop_app
        start_app
    ;;

    status)
        status_app
    ;;

    *)
        echo $USAGE
        exit 1
    ;;
esac
"""

module.exports =
class Install extends Command
  @commandName: 'install'
  @commandArgs: ['servicename','prefix']
  @options: [
    {parameter: "-t,--type [type]", description: "service type (default systemd) "}
  ]
  @commandShortDescription: 'install this the service'
  @help: () ->
    """

    """

  linuxInstallInitDFile: ()->
    me = @
    fs.writeFile '/'+path.join('etc','init.d',me.options.servicename), me.initdfile, (err)->
      if err
        throw err
      else
        console.log """
        the service is installed, as init.d
        you can start it with `service {servicename} start`
        """.replace /\{servicename\}/g, me.options.servicename


  linuxInstallServiceFile: ()->
    me = @
    fs.writeFile '/'+path.join('etc','systemd','system',me.options.servicename+'.service'), me.servicefiletext, (err)->
      if err
        throw err
      else
        console.log """
        the service is installed.
        you can start it with `systemctl start {servicename}`
        or enable it to run at boot `systemctl enable {servicename}`
        """.replace /\{servicename\}/g, me.options.servicename

  linuxInstallSysconfig: ()->
    me = @
    fs.writeFile '/'+path.join('etc','sysconfig',me.options.servicename), me.envcontent.join("\n"), (err)->
      if err
        throw err
      else
        console.log """
        the service configuration is installed on """+'/'+path.join('etc','sysconfig',me.options.servicename)+"""
        """
        me.linuxInstallServiceFile()

  linuxCheckSysconfig: ()->
    me = @
    fs.exists '/'+path.join('etc','sysconfig'), (exists)->
      if exists
        me.linuxInstallSysconfig()
      else

        fs.mkdir '/'+path.join('etc','sysconfig'), (err)->
          if err
            throw err
          else
            me.linuxInstallSysconfig()

  linuxSystemd: ()->
    me = @
    fs.exists '/'+path.join('etc','systemd','system'), (exists)->
      if not exists
        console.log "it seem you don't have systemd installed"
        console.log "but your service file should look like:"
        console.log ""
        console.log me.servicefiletext
        console.log ""
        console.log ""
        console.log "environment file should look like:"
        console.log ""
        console.log me.envcontent.join("\n")
      else
        me.linuxCheckSysconfig()

  linux: ()->
    me = @
    fs.exists '/'+path.join('etc','systemd','system',me.options.servicename+'.service'), (exists) ->
      if exists
        console.log "a service with that name is allready installed"
      else

        if me.program.type == 'initscript'
          me.linuxInstallInitDFile()
        else if me.program.type == 'systemd'
          me.linuxSystemd()
        else
          console.log "not supported service type"

  action: (program,options) ->
    paths = process.mainModule.filename.split(path.sep)
    paths.pop()
    paths.pop()

    @servicefiletext = servicefiletext.replace /\{cwd\}/g, paths.join(path.sep)
    @servicefiletext = servicefiletext.replace /\{prefix\}/g, options.prefix
    @servicefiletext = servicefiletext.replace /\{servicename\}/g, options.servicename

    @initdfile = initdfile.replace /\{cwd\}/g, paths.join(path.sep)
    @initdfile = initdfile.replace /\{prefix\}/g, options.prefix
    @initdfile = initdfile.replace /\{servicename\}/g, options.servicename

    @envcontent = []
    (@envcontent.push(name+'='+variables[name]) for name of variables)

    @vars = []
    (@vars.push(name+'="'+variables[name]+'"') for name of variables)
    @initdfile = initdfile.replace /\{vars\}/g, @vars.join(' ')

    @options = options
    @program = program
    if typeof @program.type!='string'
      @program.type='systemd'

    if os.platform() == 'linux'
      @linux()
    else
      console.log "your platform is currently not supported"
