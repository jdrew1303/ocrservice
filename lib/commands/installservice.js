(function() {
  var Command, Installservice, Regonizer, fs, path, servicefiletext, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  path = require('path');

  fs = require('fs');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  servicefiletext = "[Unit]\nDescription=ocrservice\n\n[Service]\nEnvironmentFile=-/etc/sysconfig/ocrservice\nExecStart={cwd}bin/ocrservice watch {prefix}\nRestart=always\nUser=nobody\nGroup=nobody\nEnvironment=PATH=/usr/bin:/usr/local/bin\nEnvironment=NODE_ENV=production\nWorkingDirectory={cwd}\n\n[Install]\nWantedBy=multi-user.target";

  module.exports = Installservice = (function(superClass) {
    extend(Installservice, superClass);

    function Installservice() {
      return Installservice.__super__.constructor.apply(this, arguments);
    }

    Installservice.commandName = 'installservice';

    Installservice.commandArgs = ['prefix'];

    Installservice.options = [];

    Installservice.commandShortDescription = 'install this the systemd service';

    Installservice.help = function() {
      return "";
    };

    Installservice.prototype.action = function(program, options) {
      var envcontent, name, paths;
      paths = process.mainModule.filename.split(path.sep);
      paths.pop();
      paths.pop();
      servicefiletext = servicefiletext.replace(/\{cwd\}/g, paths.join(path.sep));
      servicefiletext = servicefiletext.replace(/\{prefix\}/g, options.prefix);
      envcontent = [];
      for (name in variables) {
        envcontent.push(name + '=' + variables[name]);
      }
      return fs.exists(path.join('etc', 'systemd', 'system'), function(exists) {
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
          return fs.writeFile(path.join('etc', 'sysconfig', 'ocrservice'), envcontent.join("\n"), function(err) {
            if (err) {
              throw err;
            } else {
              console.log("the service configuration is installed on " + path.join('etc', 'sysconfig', 'ocrservice') + "            ");
              return fs.writeFile(path.join('etc', 'systemd', 'system', 'ocrservice.service'), servicefiletext, function(err) {
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
    };

    return Installservice;

  })(Command);

}).call(this);
