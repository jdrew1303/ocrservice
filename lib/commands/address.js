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

    Address.commandArgs = ['address'];

    Address.options = [
      {
        parameter: "-l,--limit [limit]",
        description: "the result limit, default is 1"
      }, {
        parameter: "-s,--separator [separator]",
        description: "the result limit, default is 1"
      }
    ];

    Address.commandShortDescription = 'extract the address from a given string';

    Address.help = function() {
      return "";
    };

    Address.prototype.action = function(program, options) {
      var regonizer;
      regonizer = new Regonizer;
      regonizer.setLineSeparator(program.separator || "\n");
      return console.log(regonizer.extractAddress(options.address));
    };

    return Address;

  })(Command);

}).call(this);
