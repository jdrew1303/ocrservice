(function() {
  var Address, Command, Recognizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Recognizer = require('../classes/recognizer');

  module.exports = Address = (function(superClass) {
    extend(Address, superClass);

    function Address() {
      return Address.__super__.constructor.apply(this, arguments);
    }

    Address.commandName = 'address';

    Address.commandArgs = ['filename'];

    Address.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Address.commandShortDescription = 'extract the address from a given image file';

    Address.help = function() {
      return "";
    };

    Address.prototype.action = function(program, options) {
      var recognizer;
      recognizer = new Recognizer;
      recognizer.setDebug(program.debug || false);
      recognizer.on('error', function(err) {
        throw err;
      });
      recognizer.on('open', function(res) {
        console.log(recognizer.barcode());
        return console.log(recognizer.text());
      });
      return recognizer.open(options.filename);
    };

    return Address;

  })(Command);

}).call(this);
