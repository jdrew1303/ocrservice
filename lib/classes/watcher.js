(function() {
  var EventEmitter, Regonizer, Watcher, fs, glob, path, socket, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  fs = require('fs');

  glob = require('glob');

  socket = require('socket.io-client');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  module.exports = Watcher = (function(superClass) {
    extend(Watcher, superClass);

    function Watcher(pathName) {
      this.intervalTimeout = 1000;
      this.debug = false;
      this.run = false;
      this.files = [];
      this.fileIndex = 0;
      this.io = socket(variables.OCR_SOCKET_IO_HOST);
      this.io.on('connect', this.socketConnected.bind(this));
      this.io.on('disconnect', this.socketDisconnected.bind(this));
      this.io.on('start', this.start.bind(this));
      this.io.on('stop', this.stop.bind(this));
    }

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
        return me.emit('stop', true);
      }
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

    Watcher.prototype.regonizeBoxes = function(res, codes) {
      var file, me, name;
      me = this;
      if (!this.run) {
        return false;
      } else {
        me.debugMessage('regonizeBoxes');
        file = path.join(me.pathName, me.files[me.fileIndex]);
        if (res.length === 0) {
          if (codes.length === 0) {
            name = me.current_stat.ctime.getTime();
            fs.rename(file, path.join(me.pathName, 'nocode', name + path.extname(file)), function(err) {
              if (err) {
                return me.emit('error', err);
              }
            });
          } else {
            name = codes.join('.');
            fs.rename(file, path.join(me.pathName, 'noaddress', name + path.extname(file)), function(err) {
              if (err) {
                return me.emit('error', err);
              }
            });
          }
        } else {
          name = codes.join('.');
          fs.rename(file, path.join(me.pathName, 'good', name + path.extname(file)), function(err) {
            var data;
            if (err) {
              me.emit('error', err);
            }
            data = {
              codes: codes,
              item: res[0].item,
              sortresult: res[0].box
            };
            if (me.debug) {
              return me.io.emit('new', data);
            } else {
              return me.io.emit('new', data);
            }
          });
        }
        me.debugMessage(JSON.stringify(res, null, 2), codes);
        me.debugMessage('next');
        return me.nextFile.bind(me)();
      }
    };

    Watcher.prototype.statFile = function(err, stat) {
      var me, now, regonizer;
      me = this;
      if (!this.run) {
        return false;
      } else {
        now = new Date;
        now.setSeconds(now.getSeconds() - 1);
        if (stat.ctime < now) {
          me.current_stat = stat;
          me.debugMessage('regonize');
          regonizer = new Regonizer;
          regonizer.setDebug(me.debug);
          regonizer.on('error', function(err) {
            throw err;
          });
          regonizer.on('open', function(res) {
            regonizer.barcode();
            return regonizer.sortbox();
          });
          regonizer.on('boxes', me.regonizeBoxes.bind(me));
          return regonizer.open(path.join(me.pathName, me.files[me.fileIndex]));
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
        if (me.fileIndex === me.files.length) {
          me.debugMessage('wait for next turn');
          return setTimeout(me.watch.bind(me), me.intervalTimeout);
        } else {
          me.debugMessage('check file', path.join(me.pathName, me.files[me.fileIndex]));
          return me.checkFile();
        }
      }
    };

    return Watcher;

  })(EventEmitter);

}).call(this);
