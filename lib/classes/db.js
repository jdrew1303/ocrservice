(function() {
  var DB, EventEmitter, mysql,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  mysql = require("mysql");

  module.exports = DB = (function(superClass) {
    extend(DB, superClass);

    function DB(db_name, db_user, db_password, db_host) {
      var options;
      options = {
        host: db_host,
        user: db_user,
        database: db_name,
        password: db_password
      };
      this.limit = 1;
      this.connection = mysql.createConnection(options);
    }

    DB.prototype.stop = function() {
      return this.connection.end();
    };

    DB.prototype.setLimit = function(number) {
      return this.limit = parseInt(number);
    };

    DB.prototype.padLeft = function(txt, length) {
      while (txt.length < length) {
        txt = "0" + txt;
      }
      return txt;
    };

    DB.prototype.findText = function(txt) {
      var m, sql;
      txt = txt.replace(';', ' ');
      sql = "SELECT\n  ocrhash.ids,\n  ocrhash.adr,\n  match(adr) against(?) as rel\nFROM\n  ocrhash\nHAVING rel > 0\nORDER BY rel DESC\nLIMIT " + this.limit + "    ";
      m = this;
      return this.connection.query(sql, [txt], function(err, rows) {
        if (err) {
          return m.emit('error', err);
        } else {
          return m.emit('ocrhash', rows);
        }
      });
    };

    DB.prototype.findSortbox = function(id, hn) {
      var evenopt, hnFormated, hn_formated, m, sql, zusatz;
      hn_formated = (parseInt(hn)) + "";
      evenopt = (parseInt(hn)) % 2 === 0;
      zusatz = hn.replace(hn_formated, "");
      hnFormated = this.padLeft(hn_formated, 4);
      sql = "SELECT\n  *\nFROM\nfast_access_tour\nWHERE strid in (" + id + ") and regiogruppe='Zustellung'";
      m = this;
      return this.connection.query(sql, function(err, rows) {
        var even, i, j, len, len1, odd, row;
        if (err) {
          return m.emit('error', err);
        } else {
          even = [];
          odd = [];
          for (i = 0, len = rows.length; i < len; i++) {
            row = rows[i];
            if (parseInt(row.hnvon) <= parseInt(hnFormated) && parseInt(row.hnbis) >= parseInt(hnFormated) && row.gerade === '1') {
              even.push(row);
            }
          }
          for (j = 0, len1 = rows.length; j < len1; j++) {
            row = rows[j];
            if (parseInt(row.hnvon) <= parseInt(hnFormated) && parseInt(row.hnbis) >= parseInt(hnFormated) && row.ungerade === '1') {
              odd.push(row);
            }
          }
          if (evenopt) {
            return m.emit('sortbox', even);
          } else {
            return m.emit('sortbox', odd);
          }
        }
      });
    };

    return DB;

  })(EventEmitter);

}).call(this);
