(function() {
  var Bounding, Command, Recognizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Recognizer = require('../classes/recognizer');

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
      var recognizer;
      recognizer = new Recognizer;
      recognizer.setDebug(program.debug || false);
      recognizer.on('error', function(err) {
        throw err;
      });
      recognizer.on('open', function(res) {
        return console.log(recognizer.outerbounding());
      });
      return recognizer.open(options.filename);
    };

    return Bounding;

  })(Command);

}).call(this);
