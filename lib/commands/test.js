(function() {
  var Command, DB, Recognizer, Sortbox, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Recognizer = require('../classes/recognizer');

  DB = require('../classes/db');

  module.exports = Sortbox = (function(superClass) {
    extend(Sortbox, superClass);

    function Sortbox() {
      return Sortbox.__super__.constructor.apply(this, arguments);
    }

    Sortbox.commandName = 'test';

    Sortbox.commandArgs = ['filename'];

    Sortbox.options = [
      {
        parameter: "-l,--processlist [processlist]",
        description: "json process instruction list"
      }, {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Sortbox.commandShortDescription = 'testing image transformation';

    Sortbox.help = function() {
      return "";
    };

    Sortbox.prototype.action = function(program, options) {
      var db, e, processlist, recognizer;
      db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
      try {
        processlist = require(program.processlist);
      } catch (_error) {
        e = _error;
      }
      recognizer = new Recognizer(db, processlist);
      recognizer.setDebug(program.debug || false);
      recognizer.on('error', function(err) {
        throw err;
      });
      recognizer.on('open', function(res) {
        return recognizer.test();
      });
      recognizer.on('boxes', function(res, codes) {
        console.log(JSON.stringify(res, null, 1));
        return db.connection.end();
      });
      return recognizer.open(options.filename, true);
    };

    return Sortbox;

  })(Command);

}).call(this);
