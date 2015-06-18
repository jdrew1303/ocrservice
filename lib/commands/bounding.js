(function() {
  var Bounding, Command, Regonizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  module.exports = Bounding = (function(superClass) {
    extend(Bounding, superClass);

    function Bounding() {
      return Bounding.__super__.constructor.apply(this, arguments);
    }

    Bounding.commandName = 'bounding';

    Bounding.commandArgs = ['filename'];

    Bounding.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Bounding.commandShortDescription = 'extract the outer bounding box from a given image file';

    Bounding.help = function() {
      return "";
    };

    Bounding.prototype.action = function(program, options) {
      var regonizer;
      regonizer = new Regonizer;
      regonizer.setDebug(program.debug || false);
      regonizer.on('error', function(err) {
        throw err;
      });
      regonizer.on('open', function(res) {
        return console.log(regonizer.outerbounding());
      });
      return regonizer.open(options.filename);
    };

    return Bounding;

  })(Command);

}).call(this);
