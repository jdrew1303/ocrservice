(function() {
  var DB, EventEmitter, distanceRanking, mysql,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  mysql = require("mysql");

  distanceRanking = function(a, b) {
    if (a.distance < b.distance) {
      return -1;
    } else if (a.distance > b.distance) {
      return 1;
    } else {
      return 0;
    }
  };

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
      this.limit = 100;
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
        var k, len, row;
        if (err) {
          return m.emit('error', err);
        } else {
          for (k = 0, len = rows.length; k < len; k++) {
            row = rows[k];
            row.distance = m.getEditDistance(row.adr, txt);
          }
          rows.sort(distanceRanking);
          return m.emit('ocrhash', rows);
        }
      });
    };

    DB.prototype.getEditDistance = function(a, b) {
      var i, j, k, l, matrix, n, o, ref, ref1, ref2, ref3;
      if (a.length === 0) {
        b.length;
      }
      if (b.length === 0) {
        a.length;
      }
      matrix = [];
      for (i = k = 0, ref = b.length; 0 <= ref ? k <= ref : k >= ref; i = 0 <= ref ? ++k : --k) {
        matrix[i] = [i];
      }
      for (j = l = 0, ref1 = a.length; 0 <= ref1 ? l <= ref1 : l >= ref1; j = 0 <= ref1 ? ++l : --l) {
        matrix[0][j] = j;
      }
      for (i = n = 1, ref2 = b.length; 1 <= ref2 ? n <= ref2 : n >= ref2; i = 1 <= ref2 ? ++n : --n) {
        for (j = o = 1, ref3 = a.length; 1 <= ref3 ? o <= ref3 : o >= ref3; j = 1 <= ref3 ? ++o : --o) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
          }
        }
      }
      return matrix[b.length][a.length];
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
        var even, k, l, len, len1, odd, row;
        if (err) {
          return m.emit('error', err);
        } else {
          even = [];
          odd = [];
          for (k = 0, len = rows.length; k < len; k++) {
            row = rows[k];
            if (parseInt(row.hnvon) <= parseInt(hnFormated) && parseInt(row.hnbis) >= parseInt(hnFormated) && row.gerade === '1') {
              even.push(row);
            }
          }
          for (l = 0, len1 = rows.length; l < len1; l++) {
            row = rows[l];
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
