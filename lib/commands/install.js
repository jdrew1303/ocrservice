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

  servicefiletext = "[Unit]\nDescription=ocrservice\n\n[Service]\nEnvironmentFile=-/etc/sysconfig/{servicename}\nExecStart={cwd}bin/ocrservice watch {prefix}\nRestart=always\nUser=nobody\nGroup=nobody\nEnvironment=PATH=/usr/bin:/usr/local/bin\nEnvironment=NODE_ENV=production\nWorkingDirectory={cwd}\n\n[Install]\nWantedBy=multi-user.target";

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

    Install.prototype.action = function(program, options) {
      var envcontent, name, paths;
      paths = process.mainModule.filename.split(path.sep);
      paths.pop();
      paths.pop();
      servicefiletext = servicefiletext.replace(/\{cwd\}/g, paths.join(path.sep));
      servicefiletext = servicefiletext.replace(/\{prefix\}/g, options.prefix);
      servicefiletext = servicefiletext.replace(/\{servicename\}/g, options.servicename);
      envcontent = [];
      for (name in variables) {
        envcontent.push(name + '=' + variables[name]);
      }
      if (os.platform() === 'linux') {
        return fs.exists('/' + path.join('etc', 'sysconfig', options.servicename), function(exists) {
          if (exists) {
            return console.log("a service with that name is allready installed");
          } else {
            return fs.exists('/' + path.join('etc', 'systemd', 'system'), function(exists) {
              if (!exists) {
                console.log("it seem you don't have systemd installed");
                console.log("but your service file should look like:");
                console.log("");
                console.log(servicefiletext);
                console.log("");
                console.log("");
                console.log("environment file should look like:");
                console.log("");
                return console.log(envcontent.join("\n"));
              } else {
                return fs.writeFile('/' + path.join('etc', 'sysconfig', options.servicename), envcontent.join("\n"), function(err) {
                  if (err) {
                    throw err;
                  } else {
                    console.log("the service configuration is installed on " + '/' + path.join('etc', 'sysconfig', options.servicename) + "                  ");
                    return fs.writeFile('/' + path.join('etc', 'systemd', 'system', options.servicename + '.service'), servicefiletext, function(err) {
                      if (err) {
                        throw err;
                      } else {
                        return console.log("the service is installed.\nyou can start it with `systemctl start ocrservice`\nor enable it to run at boot `systemctl enable ocrservice`");
                      }
                    });
                  }
                });
              }
            });
          }
        });
      } else {
        return console.log("your platform is currently not supported");
      }
    };

    return Install;

  })(Command);

}).call(this);
