(function() {
  var CWatchCommand, CWatcherClient, CWatcherMaster, Command, cluster, glob, path, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  cluster = require('cluster');

  glob = require('glob');

  path = require('path');

  CWatcherMaster = require('../classes/cwatchermaster');

  CWatcherClient = require('../classes/cwatcherclient');

  module.exports = CWatchCommand = (function(superClass) {
    extend(CWatchCommand, superClass);

    function CWatchCommand() {
      return CWatchCommand.__super__.constructor.apply(this, arguments);
    }

    CWatchCommand.commandName = 'cwatch';

    CWatchCommand.commandArgs = ['pathname'];

    CWatchCommand.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    CWatchCommand.commandShortDescription = 'start the path cluster watching service';

    CWatchCommand.help = function() {
      return "";
    };

    CWatchCommand.prototype.action = function(program, options) {
      var cmaster;
      if (cluster.isMaster) {
        return cmaster = new CWatcherMaster(cluster, options.pathname);
      } else {
        return process.on('message', function(msg) {
          var cclient;
          console.log('worker', msg, options.pathname);
          cclient = new CWatcherClient(cluster, options.pathname, msg);
          cclient.on('error', function(err) {
            return console.error(err);
          });
          return cclient.on('stoped', function(err) {
            cclient.db.stop();
            return process.exit();
          });
        });
      }
    };

    return CWatchCommand;

  })(Command);

}).call(this);
