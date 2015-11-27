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
        password: db_password,
        connectTimeout: 120000,
        acquireTimeout: 120000
      };
      this.limit = 10000;
      this.connection = mysql.createConnection(options);
      this.connection.on('error', function(err) {
        error('DB', err);
        return process.exit();
      });
      this.connection.connect();
      this.connection.query('set wait_timeout=28800', [], function(err, rows) {
        return console.log(err);
      });
    }

    DB.prototype.stop = function() {
      return this.connection.end();
    };

    DB.prototype.setLimit = function(number) {
      return this.limit = 10000;
    };

    DB.prototype.padLeft = function(txt, length) {
      while (txt.length < length) {
        txt = "0" + txt;
      }
      return txt;
    };

    DB.prototype.updateocrhash = function() {
      var sql;
      debug('db', 'updateocrhash');
      sql = 'insert into ocrhash (ids,adr) select group_concat(strid separator \',\') ids, concat(strasse,\' \',plz,\' \',ort) adr from fast_access_tour group by ort,plz,strasse';
      return this.connection.query(sql, [], (function(_this) {
        return function(err, rows) {
          return _this.updated(err, rows);
        };
      })(this));
    };

    DB.prototype.updated = function(err, rows) {
      if (err) {
        return this.emit('error', err);
      } else {
        return this.emit('updated', true);
      }
    };

    DB.prototype.ddl = function() {
      debug('db', 'ddl');
      return this.dropTableFastAccessTour();
    };

    DB.prototype.dropTableFastAccessTour = function() {
      debug('db', 'drop fast_access_tour');
      return this.connection.query('drop table fast_access_tour', [], (function(_this) {
        return function(err, rows) {
          return _this.dropTableOCRHash(err, rows);
        };
      })(this));
    };

    DB.prototype.dropTableOCRHash = function(err, rows) {
      if (err) {
        return this.emit('error', err);
      } else {
        debug('db', 'drop ocrhash');
        return this.connection.query('drop table ocrhash', [], (function(_this) {
          return function(err, rows) {
            return _this.createTableOCRHash(err, rows);
          };
        })(this));
      }
    };

    DB.prototype.createTableOCRHash = function(err, rows) {
      if (err) {
        return this.emit('error', err);
      } else {
        debug('db', 'create ocrhash');
        return this.connection.query('create table ocrhash (ids varchar(255) primary key,adr text ) engine myisam', [], (function(_this) {
          return function(err, rows) {
            return _this.createFTIndexOCRHash(err, rows);
          };
        })(this));
      }
    };

    DB.prototype.createFTIndexOCRHash = function(err, rows) {
      if (err) {
        return this.emit('error', err);
      } else {
        debug('db', 'create fulltext index');
        return this.connection.query('create fulltext index id_ft_hash on ocrhash(adr)', [], (function(_this) {
          return function(err, rows) {
            return _this.createTableFastAccessTour(err, rows);
          };
        })(this));
      }
    };

    DB.prototype.createTableFastAccessTour = function(err, rows) {
      var sql;
      if (err) {
        return this.emit('error', err);
      } else {
        debug('db', 'create fast_access_tour');
        sql = 'CREATE TABLE `fast_access_tour` ( `strid` int(11) DEFAULT NULL, `mandant` varchar(10) DEFAULT NULL, `regiogruppe` varchar(100) DEFAULT NULL, `bereich` varchar(100) DEFAULT NULL, `sortiergang` varchar(100) DEFAULT NULL, `sortierfach` varchar(100) DEFAULT NULL, `plz` varchar(100) DEFAULT NULL, `ort` varchar(100) DEFAULT NULL, `ortsteil` varchar(100) DEFAULT NULL, `hnvon` varchar(4) DEFAULT NULL, `hnbis` varchar(4) DEFAULT NULL, `zuvon` varchar(10) DEFAULT NULL, `zubis` varchar(10) DEFAULT NULL, `gerade` varchar(3) DEFAULT NULL, `ungerade` varchar(3) DEFAULT NULL, `strasse` varchar(255) DEFAULT NULL, KEY `idx_fat_id` (`strid`), KEY `idx_fat_mnd` (`mandant`), KEY `idx_fat_rg` (`regiogruppe`), KEY `idx_fat_be` (`bereich`), KEY `idx_fat_sf` (`sortierfach`), KEY `idx_fat_sg` (`sortiergang`), KEY `idx_fat_plz` (`plz`), KEY `idx_fat_str` (`strasse`) ) ENGINE=InnoDB DEFAULT CHARSET=latin1';
        return this.connection.query(sql, [], (function(_this) {
          return function(err, rows) {
            return _this.createdTableFastAccessTour(err, rows);
          };
        })(this));
      }
    };

    DB.prototype.createdTableFastAccessTour = function(err, rows) {
      if (err) {
        return this.emit('error', err);
      } else {
        debug('db', 'tables created');
        return this.emit('tablescreated', true);
      }
    };

    DB.prototype.fastaccess = function(list, index) {
      var item, k, len, me, name, p, params, sql, v;
      me = this;
      if (typeof index === 'undefined') {
        debug('db', 'remove fast access');
        me.once('tablescreated', function(r) {
          return me.fastaccess(list, 0);
        });
        return me.ddl();
      } else {
        if (index < list.length) {
          item = list[index];
          params = ['strid', 'bereich', 'sortiergang', 'sortierfach', 'plz', 'ort', 'ortsteil', 'hnvon', 'hnbis', 'zuvon', 'zubis', 'gerade', 'ungerade', 'strasse'];
          p = [];
          v = [];
          for (k = 0, len = params.length; k < len; k++) {
            name = params[k];
            p.push('?');
            v.push(item[name]);
          }
          sql = 'insert into fast_access_tour (' + params.join(',') + ') values (' + p.join(',') + ')';
          return me.connection.query(sql, v, function(err, rows) {
            if (err) {
              return m.emit('error', err);
            } else {
              return me.fastaccess(list, index + 1);
            }
          });
        } else {
          return me.updateocrhash();
        }
      }
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
      sql = "SELECT\n  *\nFROM\nfast_access_tour\nWHERE strid in (" + id + ")";
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
