(function() {
  var Barcode, Command, Regonizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  module.exports = Barcode = (function(superClass) {
    extend(Barcode, superClass);

    function Barcode() {
      return Barcode.__super__.constructor.apply(this, arguments);
    }

    Barcode.commandName = 'barcode';

    Barcode.commandArgs = ['filename'];

    Barcode.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Barcode.commandShortDescription = 'extract the barcode from a given image file';

    Barcode.help = function() {
      return "";
    };

    Barcode.prototype.action = function(program, options) {
      var regonizer;
      regonizer = new Regonizer;
      regonizer.setDebug(program.debug || false);
      regonizer.on('error', function(err) {
        throw err;
      });
      regonizer.on('open', function(res) {
        return console.log(regonizer.barcode());
      });
      return regonizer.open(options.filename);
    };

    return Barcode;

  })(Command);

}).call(this);
