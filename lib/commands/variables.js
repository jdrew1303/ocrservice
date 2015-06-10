(function() {
  var Command, Variables, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  module.exports = Variables = (function(superClass) {
    extend(Variables, superClass);

    function Variables() {
      return Variables.__super__.constructor.apply(this, arguments);
    }

    Variables.commandName = 'variables';

    Variables.commandArgs = [];

    Variables.commandShortDescription = 'show all variables';

    Variables.help = function() {
      return "";
    };

    Variables.prototype.action = function(program, options) {
      return console.log(variables);
    };

    return Variables;

  })(Command);

}).call(this);
