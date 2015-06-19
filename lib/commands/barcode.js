(function() {
  var Barcode, Command, Recognizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Recognizer = require('../classes/recognizer');

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
      var recognizer;
      recognizer = new Recognizer;
      recognizer.setDebug(program.debug || false);
      recognizer.on('error', function(err) {
        throw err;
      });
      recognizer.on('open', function(res) {
        return console.log(recognizer.barcode());
      });
      return recognizer.open(options.filename);
    };

    return Barcode;

  })(Command);

}).call(this);
