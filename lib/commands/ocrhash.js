(function() {
  var Command, DB, Ocrhash, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  DB = require('../classes/db');

  module.exports = Ocrhash = (function(superClass) {
    extend(Ocrhash, superClass);

    function Ocrhash() {
      return Ocrhash.__super__.constructor.apply(this, arguments);
    }

    Ocrhash.commandName = 'ocrhash';

    Ocrhash.commandArgs = ['searchtext'];

    Ocrhash.options = [
      {
        parameter: "-l,--limit [limit]",
        description: "the result limit, default is 1"
      }
    ];

    Ocrhash.commandShortDescription = 'query the ocr hash by a pure string';

    Ocrhash.help = function() {
      return "";
    };

    Ocrhash.prototype.action = function(program, options) {
      var db;
      db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
      db.setLimit(program.limit || 1);
      db.on('error', function(err) {
        throw err;
      });
      db.on('ocrhash', function(res) {
        console.log(res);
        return process.exit();
      });
      return db.findText(options.searchtext);
    };

    return Ocrhash;

  })(Command);

}).call(this);
