(function() {
  var Command, Install, Regonizer, fs, initdfile, os, path, servicefiletext, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  path = require('path');

  fs = require('fs');

  os = require('os');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  servicefiletext = "[Unit]\nDescription={servicename}\n\n[Service]\nEnvironmentFile=-/etc/sysconfig/{servicename}\nExecStart={cwd}bin/ocrservice watch {prefix}\nRestart=always\nUser=nobody\nGroup=nobody\nEnvironment=PATH=/usr/bin:/usr/local/bin\nEnvironment=NODE_ENV=production\nWorkingDirectory={cwd}\n\n[Install]\nWantedBy=multi-user.target\nAlias={servicename}.service";

  initdfile = "#!/bin/sh\n\n###############\n\n# REDHAT chkconfig header\n\n# chkconfig: - 58 74\n# description: node-app is the script for starting a node app on boot.\n### BEGIN INIT INFO\n# Provides: node\n# Required-Start:    $network $remote_fs $local_fs\n# Required-Stop:     $network $remote_fs $local_fs\n# Default-Start:     2 3 4 5\n# Default-Stop:      0 1 6\n# Short-Description: start and stop node\n# Description: Node process for app\n### END INIT INFO\n\n###############\n\n\nNODE_ENV=\"production\"\nAPP_DIR=\"{cwd}\"\nNODE_APP=\"bin/ocrservice watch {prefix}\"\nCONFIG_DIR=\"$APP_DIR\"\nPID_DIR=\"$APP_DIR/pid\"\nPID_FILE=\"$PID_DIR/app.pid\"\nLOG_DIR=\"$APP_DIR/log\"\nLOG_FILE=\"$LOG_DIR/app.log\"\nNODE_EXEC=$(which node)\n\n\nUSAGE=\"Usage: $0 {start|stop|restart|status} [--force]\"\nFORCE_OP=false\n\npid_file_exists() {\n    [ -f \"$PID_FILE\" ]\n}\n\nget_pid() {\n    echo \"$(cat \"$PID_FILE\")\"\n}\n\nis_running() {\n    PID=$(get_pid)\n    ! [ -z \"$(ps aux | awk '{print $2}' | grep \"^$PID$\")\" ]\n}\n\nstart_it() {\n    mkdir -p \"$PID_DIR\"\n    mkdir -p \"$LOG_DIR\"\n\n    echo \"Starting node app ...\"\n    {vars} NODE_ENV=\"$NODE_ENV\" NODE_CONFIG_DIR=\"$CONFIG_DIR\" $NODE_EXEC \"$APP_DIR/$NODE_APP\"  1>\"$LOG_FILE\" 2>&1 &\n    echo $! > \"$PID_FILE\"\n    echo \"Node app started with pid $!\"\n}\n\nstop_process() {\n    PID=$(get_pid)\n    echo \"Killing process $PID\"\n    kill $PID\n}\n\nremove_pid_file() {\n    echo \"Removing pid file\"\n    rm -f \"$PID_FILE\"\n}\n\nstart_app() {\n    if pid_file_exists\n    then\n        if is_running\n        then\n            PID=$(get_pid)\n            echo \"Node app already running with pid $PID\"\n            exit 1\n        else\n            echo \"Node app stopped, but pid file exists\"\n            if [ $FORCE_OP = true ]\n            then\n                echo \"Forcing start anyways\"\n                remove_pid_file\n                start_it\n            fi\n        fi\n    else\n        start_it\n    fi\n}\n\nstop_app() {\n    if pid_file_exists\n    then\n        if is_running\n        then\n            echo \"Stopping node app ...\"\n            stop_process\n            remove_pid_file\n            echo \"Node app stopped\"\n        else\n            echo \"Node app already stopped, but pid file exists\"\n            if [ $FORCE_OP = true ]\n            then\n                echo \"Forcing stop anyways ...\"\n                remove_pid_file\n                echo \"Node app stopped\"\n            else\n                exit 1\n            fi\n        fi\n    else\n        echo \"Node app already stopped, pid file does not exist\"\n        exit 1\n    fi\n}\n\nstatus_app() {\n    if pid_file_exists\n    then\n        if is_running\n        then\n            PID=$(get_pid)\n            echo \"Node app running with pid $PID\"\n        else\n            echo \"Node app stopped, but pid file exists\"\n        fi\n    else\n        echo \"Node app stopped\"\n    fi\n}\n\ncase \"$2\" in\n    --force)\n        FORCE_OP=true\n    ;;\n\n    \"\")\n    ;;\n\n    *)\n        echo $USAGE\n        exit 1\n    ;;\nesac\n\ncase \"$1\" in\n    start)\n        start_app\n    ;;\n\n    stop)\n        stop_app\n    ;;\n\n    restart)\n        stop_app\n        start_app\n    ;;\n\n    status)\n        status_app\n    ;;\n\n    *)\n        echo $USAGE\n        exit 1\n    ;;\nesac";

  module.exports = Install = (function(superClass) {
    extend(Install, superClass);

    function Install() {
      return Install.__super__.constructor.apply(this, arguments);
    }

    Install.commandName = 'install';

    Install.commandArgs = ['servicename', 'prefix'];

    Install.options = [
      {
        parameter: "-t,--type [type]",
        description: "service type (default systemd) "
      }
    ];

    Install.commandShortDescription = 'install this the service';

    Install.help = function() {
      return "";
    };

    Install.prototype.linuxInstallInitDFile = function() {
      var me;
      me = this;
      return fs.writeFile('/' + path.join('etc', 'init.d', me.options.servicename), me.initdfile, function(err) {
        if (err) {
          throw err;
        } else {
          return console.log("the service is installed, as init.d\nyou can start it with `service {servicename} start`\nor with `/etc/init.d/{servicename} start`".replace(/\{servicename\}/g, me.options.servicename).replace(/\{cwd\}/g, process.cwd()));
        }
      });
    };

    Install.prototype.linuxInstallServiceFile = function() {
      var me;
      me = this;
      return fs.writeFile('/' + path.join('etc', 'systemd', 'system', me.options.servicename + '.service'), me.servicefiletext, function(err) {
        if (err) {
          throw err;
        } else {
          return console.log("the service is installed.\nyou can start it with `systemctl start {servicename}`\nor enable it to run at boot `systemctl enable {servicename}`".replace(/\{servicename\}/g, me.options.servicename).replace(/\{cwd\}/g, process.cwd()));
        }
      });
    };

    Install.prototype.linuxInstallSysconfig = function() {
      var me;
      me = this;
      return fs.writeFile('/' + path.join('etc', 'sysconfig', me.options.servicename), me.envcontent.join("\n"), function(err) {
        if (err) {
          throw err;
        } else {
          console.log("the service configuration is installed on " + '/' + path.join('etc', 'sysconfig', me.options.servicename) + "        ");
          return me.linuxInstallServiceFile();
        }
      });
    };

    Install.prototype.linuxCheckSysconfig = function() {
      var me;
      me = this;
      return fs.exists('/' + path.join('etc', 'sysconfig'), function(exists) {
        if (exists) {
          return me.linuxInstallSysconfig();
        } else {
          return fs.mkdir('/' + path.join('etc', 'sysconfig'), function(err) {
            if (err) {
              throw err;
            } else {
              return me.linuxInstallSysconfig();
            }
          });
        }
      });
    };

    Install.prototype.linuxSystemd = function() {
      var me;
      me = this;
      return fs.exists('/' + path.join('etc', 'systemd', 'system'), function(exists) {
        if (!exists) {
          console.log("it seem you don't have systemd installed");
          console.log("but your service file should look like:");
          console.log("");
          console.log(me.servicefiletext);
          console.log("");
          console.log("");
          console.log("environment file should look like:");
          console.log("");
          return console.log(me.envcontent.join("\n"));
        } else {
          return me.linuxCheckSysconfig();
        }
      });
    };

    Install.prototype.linux = function() {
      var me;
      me = this;
      return fs.exists('/' + path.join('etc', 'systemd', 'system', me.options.servicename + '.service'), function(exists) {
        if (exists) {
          return console.log("a service with that name is allready installed");
        } else {
          if (me.program.type === 'init') {
            return me.linuxInstallInitDFile();
          } else if (me.program.type === 'systemd') {
            return me.linuxSystemd();
          } else {
            return console.log("not supported service type");
          }
        }
      });
    };

    Install.prototype.action = function(program, options) {
      var name, paths;
      paths = process.mainModule.filename.split(path.sep);
      paths.pop();
      paths.pop();
      this.servicefiletext = servicefiletext.replace(/\{cwd\}/g, paths.join(path.sep));
      this.servicefiletext = this.servicefiletext.replace(/\{prefix\}/g, options.prefix);
      this.servicefiletext = this.servicefiletext.replace(/\{servicename\}/g, options.servicename);
      this.initdfile = initdfile.replace(/\{cwd\}/g, paths.join(path.sep));
      this.initdfile = this.initdfile.replace(/\{prefix\}/g, options.prefix);
      this.initdfile = this.initdfile.replace(/\{servicename\}/g, options.servicename);
      console.log(this.initdfile);
      process.exit();
      this.envcontent = [];
      for (name in variables) {
        this.envcontent.push(name + '=' + variables[name]);
      }
      this.vars = [];
      for (name in variables) {
        this.vars.push(name + '="' + variables[name] + '"');
      }
      this.initdfile = initdfile.replace(/\{vars\}/g, this.vars.join(' '));
      this.options = options;
      this.program = program;
      if (typeof this.program.type !== 'string') {
        this.program.type = 'systemd';
      }
      if (os.platform() === 'linux') {
        return this.linux();
      } else {
        return console.log("your plattform is currently not supported");
      }
    };

    return Install;

  })(Command);

}).call(this);
