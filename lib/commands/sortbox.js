(function() {
  var Command, Recognizer, Sortbox, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Recognizer = require('../classes/recognizer');

  module.exports = Sortbox = (function(superClass) {
    extend(Sortbox, superClass);

    function Sortbox() {
      return Sortbox.__super__.constructor.apply(this, arguments);
    }

    Sortbox.commandName = 'sortbox';

    Sortbox.commandArgs = ['filename'];

    Sortbox.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Sortbox.commandShortDescription = 'extract the sortboxes from a given image file';

    Sortbox.help = function() {
      return "";
    };

    Sortbox.prototype.action = function(program, options) {
      var recognizer;
      recognizer = new Recognizer;
      recognizer.setDebug(program.debug || false);
      recognizer.on('error', function(err) {
        throw err;
      });
      recognizer.on('open', function(res) {
        return recognizer.sortbox();
      });
      recognizer.on('boxes', function(res) {
        console.log(JSON.stringify(res, null, 2));
        return process.exit();
      });
      return recognizer.open(options.filename);
    };

    return Sortbox;

  })(Command);

}).call(this);
