(function() {
  var Command, DB, Findtext, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  DB = require('../classes/db');

  module.exports = Findtext = (function(superClass) {
    extend(Findtext, superClass);

    function Findtext() {
      return Findtext.__super__.constructor.apply(this, arguments);
    }

    Findtext.commandName = 'findtext';

    Findtext.commandArgs = ['searchtext', 'housenumber'];

    Findtext.options = [
      {
        parameter: "-l,--limit [limit]",
        description: "the result limit, default is 1"
      }
    ];

    Findtext.commandShortDescription = 'retrieving the sort information bx string and housenumber';

    Findtext.help = function() {
      return "";
    };

    Findtext.prototype.action = function(program, options) {
      var db;
      db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
      db.setLimit(program.limit || 1);
      db.on('error', function(err) {
        throw err;
      });
      db.on('sortbox', function(res) {
        console.log(res);
        return process.exit();
      });
      db.on('ocrhash', function(res) {
        if (res.length > 0) {
          return db.findSortbox(res[0].ids, options.housenumber);
        } else {
          console.log("no matches");
          return process.exit();
        }
      });
      return db.findText(options.searchtext);
    };

    return Findtext;

  })(Command);

}).call(this);
