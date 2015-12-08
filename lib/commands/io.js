(function() {
  var Command, IO, Sortbox, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  IO = require('../classes/io');

  module.exports = Sortbox = (function(superClass) {
    extend(Sortbox, superClass);

    function Sortbox() {
      return Sortbox.__super__.constructor.apply(this, arguments);
    }

    Sortbox.commandName = 'io';

    Sortbox.commandArgs = ['noaddress', 'goodpath', 'badpath'];

    Sortbox.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Sortbox.commandShortDescription = 'start the path io service';

    Sortbox.help = function() {
      return "";
    };

    Sortbox.prototype.action = function(program, options) {
      this.noaddress = options.noaddress;
      this.goodpath = options.goodpath;
      this.badpath = options.badpath;
      return this.socketServer();
    };

    Sortbox.prototype.socketServer = function() {
      this.io_client = new IO(this);
      return this.io_client.setPath(this.noaddress, this.goodpath, this.badpath);
    };

    return Sortbox;

  })(Command);

}).call(this);
