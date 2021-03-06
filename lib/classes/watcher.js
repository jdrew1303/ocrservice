(function() {
  var DB, ERP, EventEmitter, IO, Recognizer, Watcher, fs, glob, path, socket, udpfindme, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  fs = require('fs');

  glob = require('glob');

  IO = require('../classes/io');

  socket = require('socket.io-client');

  variables = require('../variables');

  Recognizer = require('./recognizer');

  DB = require('./db');

  ERP = require('./erp');

  udpfindme = require('udpfindme');

  module.exports = Watcher = (function(superClass) {
    extend(Watcher, superClass);

    function Watcher(pathName) {
      var options;
      this.intervalTimeout = 1000;
      this.debug = false;
      this.run = false;
      this.files = [];
      this.fileIndex = 0;
      this.db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
      this.db.setLimit(100);
      this.db.on('updated', (function(_this) {
        return function(num) {
          return _this.onDBUpdated(num);
        };
      })(this));
      this.db.on('error', function(err) {
        throw err;
      });
      options = {
        key: 'watcher',
        client: variables.ERP_CLIENT,
        login: variables.ERP_LOGIN,
        password: variables.ERP_PASSWORD
      };
      this.erp = new ERP(options);
      this.erp.on('loginError', (function(_this) {
        return function(msg) {
          return _this.onERPLoginError(msg);
        };
      })(this));
      this.erp.on('loginSuccess', (function(_this) {
        return function(msg) {
          return _this.onERPLoginSuccess(msg);
        };
      })(this));
      this.erp.on('put', (function(_this) {
        return function(msg) {
          return _this.onERPPut(msg);
        };
      })(this));
      this.erp.on('fastaccess', (function(_this) {
        return function(msg) {
          return _this.onERPFastAccess(msg);
        };
      })(this));
      this.erp.on('error', (function(_this) {
        return function(msg) {
          return _this.onERPError(msg);
        };
      })(this));
      this.erp.on('connect', (function(_this) {
        return function(msg) {
          return _this.onERPConnect(msg);
        };
      })(this));
      this.erp.on('disconnect', (function(_this) {
        return function(msg) {
          return _this.onERPDisconnect(msg);
        };
      })(this));
    }

    Watcher.prototype.onERPConnect = function(msg) {
      debug('erp login', '---');
      return this.erp.login();
    };

    Watcher.prototype.onERPDisconnect = function() {
      debug('erp disconnect', '---');
      return this.run = false;
    };

    Watcher.prototype.onERPLoginError = function(msg) {
      return console.log(msg);
    };

    Watcher.prototype.onERPLoginSuccess = function(msg) {
      this.erp.fastaccess();
      return debug('watcher', 'login success');
    };

    Watcher.prototype.onERPPut = function(msg) {
      return setTimeout(this.nextFile.bind(this), 1);
    };

    Watcher.prototype.onERPFastAccess = function(list) {
      debug('watcher', 'on fastaccess ' + list.length);
      return this.db.fastaccess(list);
    };

    Watcher.prototype.onDBUpdated = function(num) {
      debug('updated', 'ready');
      return this.start();
    };

    Watcher.prototype.onERPError = function(msg) {
      return console.log(msg);
    };

    Watcher.prototype.socketConnected = function() {
      var me;
      me = this;
      me.debugMessage('socket connected');
      return me.io.emit('ocrservice', me.pathName);
    };

    Watcher.prototype.socketDisconnected = function() {
      var me;
      me = this;
      me.debugMessage('socket disconnected');
      return me.stop();
    };

    Watcher.prototype.setPath = function(pathName) {
      var me;
      if (!pathName) {
        throw new Error('you must give a path name');
      }
      this.pathName = pathName;
      this.socketServer();
      me = this;
      return fs.exists(this.pathName, function(exists) {
        if (!exists) {
          throw new Error('the directory does not exists ' + me.pathName);
        } else {
          me.createPath('good');
          me.createPath('unclear');
          me.createPath('nocode');
          me.createPath('noaddress');
          return me.createPath('bad');
        }
      });
    };

    Watcher.prototype.createPath = function(name) {
      var me;
      me = this;
      return fs.exists(path.join(me.pathName, name), function(exists) {
        if (!exists) {
          return fs.mkdir(path.join(me.pathName, name), function(error) {
            if (error) {
              return me.emit('error', err);
            }
          });
        }
      });
    };

    Watcher.prototype.setDebug = function(mode) {
      return this.debug = mode;
    };

    Watcher.prototype.debugMessage = function(msg) {
      if (this.debug) {
        return console.log('debug', msg);
      }
    };

    Watcher.prototype.start = function() {
      var me;
      me = this;
      if (!this.run) {
        me.emit('start', true);
        this.run = true;
        return me.watch();
      }
    };

    Watcher.prototype.stop = function() {
      var me;
      me = this;
      if (this.run) {
        this.run = false;
        me.emit('stop', true);
        if (this.io_client != null) {
          return true;
        }
      }
    };

    Watcher.prototype.socketServer = function() {
      this.io_client = new IO(this);
      return this.io_client.setPath(this.pathName);
    };

    Watcher.prototype.watch = function() {
      var me, options, pattern;
      me = this;
      if (!this.run) {
        return false;
      } else {
        options = {
          cwd: me.pathName
        };
        pattern = variables.OCR_WATCH_PATTERN;
        return glob(pattern, options, function(err, matches) {
          if (err) {
            return me.emit('error', err);
          } else {
            me.files = matches;
            me.fileIndex = 0;
            me.debugMessage(me.files.length, 'files');
            return me.runList();
          }
        });
      }
    };

    Watcher.prototype.recognizeBoxes = function(res, codes) {
      var file, me, name;
      me = this;
      if (!this.run) {
        return false;
      } else {
        me.debugMessage('recognizerBoxes');
        file = path.join(me.pathName, me.files[me.fileIndex]);
        if (codes.length === 0) {
          return me.fullScann(codes, 'nocode');
        } else {
          if (res.length === 0 || typeof res[0].box === 'undefined' || res[0].box.length === 0) {
            return me.fullScann(codes, 'noaddress');
          } else if (res.length === 1) {
            name = res[0].codes.join('.');
            return fs.rename(file, path.join(me.pathName, 'good', name + path.extname(file)), function(err) {
              if (err) {
                console.trace(err);
                return me.emit('error', err);
              } else {
                debug('put', res);
                return me.erp.put(res[0]);
              }
            });
          } else {
            name = res[0].codes.join('.');
            fs.rename(file, path.join(me.pathName, 'unclear', name + path.extname(file)), function(err) {
              if (err) {
                console.trace(err);
                return me.emit('error', err);
              }
            });
            return fs.writeFile(path.join(me.pathName, 'unclear', name + '.txt'), JSON.stringify(res, null, 2), function(err) {
              if (err) {
                console.trace(err);
                return me.emit('error', err);
              } else {
                return setTimeout(me.nextFile.bind(me), 1);
              }
            });
          }
        }
      }
    };

    Watcher.prototype.statFile = function(err, stat) {
      var me, now;
      me = this;
      if (!this.run) {
        return false;
      } else {
        now = new Date;
        now.setSeconds(now.getSeconds() - 1);
        if (stat.ctime < now) {
          me.current_stat = stat;
          me.debugMessage('recognize');
          this.recognizer = new Recognizer(me.db);
          this.recognizer.setDebug(me.debug);
          this.recognizer.on('error', function(err) {
            var file;
            file = path.join(me.pathName, me.files[me.fileIndex]);
            fs.writeFile(path.join(me.pathName, 'bad', path.basename(file) + '.txt'), JSON.stringify(err, null, 2), function(err) {
              if (err) {
                return me.emit('error', err);
              }
            });
            return fs.rename(file, path.join(me.pathName, 'bad', path.basename(file)), function(err) {
              if (err) {
                return me.emit('error', err);
              } else {
                return setTimeout(me.nextFile.bind(me), 500);
              }
            });
          });
          this.recognizer.on('open', function(res) {
            me.recognizer.barcode();
            return me.recognizer.sortbox();
          });
          this.recognizer.on('boxes', function(res, codes) {
            return me.recognizeBoxes(res, codes);
          });
          return this.recognizer.open(path.join(me.pathName, me.files[me.fileIndex]));
        } else {
          me.debugMessage('file is too young');
          return setTimeout(me.nextFile.bind(me), 500);
        }
      }
    };

    Watcher.prototype.checkFile = function() {
      var me;
      me = this;
      if (!this.run) {
        return false;
      } else {
        me.debugMessage('stat file');
        return fs.stat(path.join(me.pathName, me.files[me.fileIndex]), me.statFile.bind(me));
      }
    };

    Watcher.prototype.nextFile = function(error) {
      var me;
      me = this;
      if (typeof me.recognizer === 'object') {
        me.recognizer.free();
      }
      me.recognizer = null;
      if (!me.run) {
        return false;
      } else {
        if (error) {
          return me.emit('error', error);
        } else {
          me.fileIndex++;
          return me.runList.bind(me)();
        }
      }
    };

    Watcher.prototype.runList = function() {
      var me;
      me = this;
      if (!this.run) {
        return false;
      } else {
        if (me.fileIndex === me.files.length || me.files.length === 0) {
          me.debugMessage('wait for next turn');
          return setTimeout(me.watch.bind(me), me.intervalTimeout);
        } else {
          console.log(me.pathName, me.files, me.fileIndex, me.files[me.fileIndex]);
          me.debugMessage('check file', path.join(me.pathName, me.files[me.fileIndex]));
          return me.checkFile();
        }
      }
    };

    Watcher.prototype.fullScann = function(codes, failpath) {
      var file, me;
      me = this;
      file = path.join(me.pathName, me.files[me.fileIndex]);
      debug('fullscann', file, 'failpath', failpath);
      this.recognizer = new Recognizer;
      this.recognizer.setDebug(false);
      this.recognizer.on('error', function(err) {
        return me.noAddress(codes);
      });
      this.recognizer.on('open', function(res) {
        var adr, data, item, r;
        r = me.recognizer.outerbounding();
        item = {
          rect: r
        };
        me.recognizer.barcode();
        me.recognizer.getText(item);
        data = {
          codes: me.recognizer.barcodes
        };
        data.txt = me.recognizer.texts;
        data.zipCode = "";
        data.town = "";
        data.street = "";
        data.housenumber = "";
        data.housenumberExtension = "";
        if (data.txt.length > 0) {
          adr = me.recognizer.getAddress(data.txt[0], true);
          data.adr = adr;
          data.zipCode = adr.zipCode;
          data.town = adr.town;
          data.street = adr.street;
          data.housenumber = adr.housenumber;
          data.housenumberExtension = adr.housenumberExtension;
        }
        debug('sortboxAfterText', data);
        me.recognizer.addresses.push(data);
        return me.recognizer.sortboxAfterText();
      });
      this.recognizer.once('boxes', function(boxes, codes) {
        var name, ref;
        name = codes.join('.');
        if (boxes.length > 0 && codes.length > 0 && ((ref = boxes[0].box) != null ? ref.length : void 0) > 0) {
          boxes[0].codes = codes;
          console.log(path.join(me.pathName, 'good', name + path.extname(file)));
          return fs.rename(file, path.join(me.pathName, 'good', name + path.extname(file)), function(err) {
            if (err) {
              console.trace(err);
              return me.emit('error', err);
            } else {
              debug('put', boxes);
              return me.erp.put(boxes[0]);
            }
          });
        } else {
          if (failpath === 'nocode') {
            name = me.current_stat.ctime.getTime();
          }
          console.log(path.join(me.pathName, failpath, name + path.extname(file)));
          return fs.rename(file, path.join(me.pathName, failpath, name + path.extname(file)), function(err) {
            if (err) {
              console.trace(err);
              return me.emit('error', err);
            } else {
              return setTimeout(me.nextFile.bind(me), 1);
            }
          });
        }
      });
      return this.recognizer.open(file, false);
    };

    Watcher.prototype.noAddress = function(codes) {
      var file, name;
      file = path.join(me.pathName, me.files[me.fileIndex]);
      name = codes.join('.');
      return fs.rename(file, path.join(me.pathName, 'noaddress', name + path.extname(file)), function(err) {
        if (err) {
          console.trace(err);
          return me.emit('error', err);
        } else {
          return setTimeout(me.nextFile.bind(me), 1);
        }
      });
    };

    return Watcher;

  })(EventEmitter);

}).call(this);
