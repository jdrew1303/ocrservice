(function() {
  var Command, Housenumber, Regonizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  module.exports = Housenumber = (function(superClass) {
    extend(Housenumber, superClass);

    function Housenumber() {
      return Housenumber.__super__.constructor.apply(this, arguments);
    }

    Housenumber.commandName = 'housenumber';

    Housenumber.commandArgs = ['streetline'];

    Housenumber.options = [];

    Housenumber.commandShortDescription = 'extract the housenumber from a given string';

    Housenumber.help = function() {
      return "";
    };

    Housenumber.prototype.action = function(program, options) {
      var regonizer;
      regonizer = new Regonizer;
      return console.log(regonizer.extractHousenumber(options.streetline));
    };

    return Housenumber;

  })(Command);

}).call(this);
