(function() {
  var Command, Install, Regonizer, fs, os, path, servicefiletext, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  path = require('path');

  fs = require('fs');

  os = require('os');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  servicefiletext = "[Unit]\nDescription={servicename}\n\n[Service]\nEnvironmentFile=-/etc/sysconfig/{servicename}\nExecStart={cwd}bin/ocrservice watch {prefix}\nRestart=always\nUser=nobody\nGroup=nobody\nEnvironment=PATH=/usr/bin:/usr/local/bin\nEnvironment=NODE_ENV=production\nWorkingDirectory={cwd}\n\n[Install]\nWantedBy=multi-user.target\nAlias={servicename}.service";

  module.exports = Install = (function(superClass) {
    extend(Install, superClass);

    function Install() {
      return Install.__super__.constructor.apply(this, arguments);
    }

    Install.commandName = 'install';

    Install.commandArgs = ['servicename', 'prefix'];

    Install.options = [];

    Install.commandShortDescription = 'install this the systemd service';

    Install.help = function() {
      return "";
    };

    Install.prototype.linuxInstallServiceFile = function() {
      var me;
      me = this;
      return fs.writeFile('/' + path.join('etc', 'systemd', 'system', me.options.servicename + '.service'), me.servicefiletext, function(err) {
        if (err) {
          throw err;
        } else {
          return console.log("the service is installed.\nyou can start it with `systemctl start {servicename}`\nor enable it to run at boot `systemctl enable {servicename}`");
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
          return me.linuxSystemd();
        }
      });
    };

    Install.prototype.action = function(program, options) {
      var name, paths;
      paths = process.mainModule.filename.split(path.sep);
      paths.pop();
      paths.pop();
      this.servicefiletext = servicefiletext.replace(/\{cwd\}/g, paths.join(path.sep));
      this.servicefiletext = servicefiletext.replace(/\{prefix\}/g, options.prefix);
      this.servicefiletext = servicefiletext.replace(/\{servicename\}/g, options.servicename);
      this.envcontent = [];
      for (name in variables) {
        this.envcontent.push(name + '=' + variables[name]);
      }
      this.options = options;
      if (os.platform() === 'linux') {
        return this.linux();
      } else {
        return console.log("your platform is currently not supported");
      }
    };

    return Install;

  })(Command);

}).call(this);
