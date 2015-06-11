(function() {
  var Address, Command, Regonizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

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
      var regonizer;
      regonizer = new Regonizer;
      regonizer.setDebug(program.debug || false);
      regonizer.on('error', function(err) {
        throw err;
      });
      regonizer.on('open', function(res) {
        console.log(regonizer.barcode());
        return console.log(regonizer.text());
      });
      return regonizer.open(options.filename);
    };

    return Address;

  })(Command);

}).call(this);
