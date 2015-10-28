(function() {
  var Command, Sortbox, Watcher, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Watcher = require('../classes/watcher');

  module.exports = Sortbox = (function(superClass) {
    extend(Sortbox, superClass);

    function Sortbox() {
      return Sortbox.__super__.constructor.apply(this, arguments);
    }

    Sortbox.commandName = 'watch';

    Sortbox.commandArgs = ['pathname'];

    Sortbox.options = [
      {
        parameter: "-l,--processlist [processlist]",
        description: "json process instruction list"
      }, {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Sortbox.commandShortDescription = 'start the path watching service';

    Sortbox.help = function() {
      return "";
    };

    Sortbox.prototype.action = function(program, options) {
      var watcher;
      watcher = new Watcher;
      watcher.setDebug(program.debug);
      watcher.on('error', function(err) {
        throw err;
      });
      watcher.on('running', function(res) {
        return console.log('the service is running');
      });
      return watcher.setPath(options.pathname);
    };

    return Sortbox;

  })(Command);

}).call(this);
