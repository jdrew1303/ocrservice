(function() {
  var AddressText, Command, Extract, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Extract = require('../classes/extract');

  module.exports = AddressText = (function(superClass) {
    extend(AddressText, superClass);

    function AddressText() {
      return AddressText.__super__.constructor.apply(this, arguments);
    }

    AddressText.commandName = 'addresstext';

    AddressText.commandArgs = ['address'];

    AddressText.options = [
      {
        parameter: "-l,--limit [limit]",
        description: "the result limit, default is 1"
      }, {
        parameter: "-s,--separator [separator]",
        description: "the result limit, default is 1"
      }
    ];

    AddressText.commandShortDescription = 'extract the address from a given string';

    AddressText.help = function() {
      return "";
    };

    AddressText.prototype.action = function(program, options) {
      var extract;
      extract = new Extract;
      extract.setLineSeparator(program.separator || "\n");
      return console.log(extract.extractAddress(options.address));
    };

    return AddressText;

  })(Command);

}).call(this);
