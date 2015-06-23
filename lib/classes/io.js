(function() {
  var ERP, EventEmitter, IO, Recognizer, cv, fs, glob, path, socketIO, udpfindme, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  fs = require('fs');

  glob = require('glob');

  socketIO = require('socket.io');

  variables = require('../variables');

  Recognizer = require('../classes/recognizer');

  ERP = require('../classes/erp');

  cv = require('opencv');

  udpfindme = require('udpfindme');

  module.exports = IO = (function(superClass) {
    extend(IO, superClass);

    function IO(watcher) {
      var discoverMessage, discoverServer;
      this.watcher = watcher;
      this.io = socketIO();
      this.io.on('connection', (function(_this) {
        return function(opt) {
          return _this.onIncommingConnection(opt);
        };
      })(this));
      this.pathAddition = 'noaddress';
      discoverServer = new udpfindme.Server(parseInt(variables.UI_DISCOVER_PORT), '0.0.0.0');
      discoverMessage = {
        port: variables.WEBSOCKET_PORT,
        type: 'ocrservice'
      };
      discoverServer.setMessage(discoverMessage);
      this.io.listen(variables.WEBSOCKET_PORT);
      this.sendings = [];
      this.clients = {};
      this.emit('listen');
    }

    IO.prototype.close = function() {
      return this.io.close();
    };

    IO.prototype.setPath = function(name) {
      this.pathName = name;
      return this.updateList();
    };

    IO.prototype.short = function(name) {
      return path.basename(name).replace(/\.tiff$/, '');
    };

    IO.prototype.initSocketEvents = function(socket) {
      var me;
      me = this;
      socket.on('disconnect', (function(_this) {
        return function(data) {
          return _this.onDisconnect(socket, data);
        };
      })(this));
      socket.on('login', (function(_this) {
        return function(data) {
          return _this.onLogin(socket, data);
        };
      })(this));
      socket.on('bad', (function(_this) {
        return function(data) {
          return _this.onBadLetter(socket, data);
        };
      })(this));
      socket.on('save', (function(_this) {
        return function(data) {
          return _this.onSaveLetter(socket, data);
        };
      })(this));
      socket.on('skip', (function(_this) {
        return function(data) {
          return _this.onSkipLetter(socket, data);
        };
      })(this));
      socket.on('check', (function(_this) {
        return function(data) {
          return _this.onCheck(socket, data);
        };
      })(this));
      return socket.on('send', (function(_this) {
        return function(data) {
          return _this.sendLetter(socket, data);
        };
      })(this));
    };

    IO.prototype.updateList = function() {
      var me, options, pattern;
      me = this;
      if (me.pathName != null) {
        options = {
          cwd: path.join(me.pathName, me.pathAddition)
        };
        pattern = variables.OCR_WATCH_PATTERN;
        return glob(pattern, options, function(err, matches) {
          var i, len, name;
          for (i = 0, len = matches.length; i < len; i++) {
            name = matches[i];
            if (me.sendings.indexOf(me.short(name)) === -1) {
              me.sendings.push(me.short(name));
            }
          }
          return me.io.emit('sendings', me.sendings);
        });
      }
    };

    IO.prototype.onIncommingConnection = function(socket) {
      debug('onIncommingConnection', socket.id);
      this.clients[socket.id] = socket;
      this.initSocketEvents(socket);
      return socket.emit('loginRequired');
    };

    IO.prototype.onDisconnect = function(socket) {
      debug('onDisconnect', socket.id);
      return delete this.clients[socket.id];
    };

    IO.prototype.onLogin = function(socket, data) {
      var me, options;
      me = this;
      options = {
        key: 'IO',
        login: data.login,
        password: data.password
      };
      warn('io line 82', 'fix me!');
      socket.emit('loginSuccess', this.watcher.erp.sid);
      return this.sendLetter(socket);
    };

    IO.prototype.onBadLetter = function(socket, data) {
      var file, me;
      me = this;
      file = path.join(me.pathName, me.pathAddition, data.id + '.tiff');
      fs.exists(file, function(exists) {
        if (exists === true) {
          fs.writeFile(path.join(me.pathName, 'bad', path.basename(file) + '.txt'), JSON.stringify(data, null, 2), function(err) {
            if (err) {
              return me.emit('error', err);
            }
          });
          return fs.rename(file, path.join(me.pathName, 'bad', path.basename(file)), function(err) {
            if (err) {
              return me.emit('error', err);
            }
          });
        }
      });
      return me.sendLetter(socket);
    };

    IO.prototype.onSaveLetter = function(socket, data) {
      var file, item, me;
      console.log('onSaveLetter 1', data.id, this.sendings);
      me = this;
      item = {
        codes: [data.code],
        box: [data.box],
        street: data.street,
        housenumber: data.housenumber,
        housenumberExtension: data.housenumberExtension,
        zipCode: data.zipCode,
        town: data.town
      };
      file = path.join(me.pathName, me.pathAddition, data.id + '.tiff');
      fs.exists(file, function(exists) {
        if (exists === true) {
          return fs.rename(file, path.join(me.pathName, 'good', path.basename(file)), function(err) {
            if (err) {
              socket.emit('someerror', 'renaming');
              return me.sendLetter(socket);
            } else {
              return me.sendLetter(socket);
            }
          });
        } else {
          return me.sendLetter(socket);
        }
      });
      debug('io put', item);
      return me.watcher.erp.put(item);
    };

    IO.prototype.onSkipLetter = function(socket, data) {
      var me;
      me = this;
      this.sendings.push(data.id);
      return this.sendLetter(socket);
    };

    IO.prototype.onCheck = function(socket, data) {
      var me, recognizer;
      me = this;
      recognizer = new Recognizer;
      recognizer.setDebug(false);
      recognizer.addresses.push(data);
      recognizer.once('boxes', function(boxes, codes) {
        return socket.emit('checked', boxes);
      });
      return recognizer.sortboxAfterText();
    };

    IO.prototype.sendLetter = function(socket, data) {
      var me, name, recognizer;
      me = this;
      if (this.sendings.length === 0) {
        socket.emit('empty', true);
        return this.updateList();
      } else {
        data = {
          id: this.sendings.shift()
        };
        if (this.sendings.length === 0) {
          this.updateList();
        }
        name = path.join(me.pathName, me.pathAddition, data.id + '.tiff');
        recognizer = new Recognizer;
        recognizer.setDebug(false);
        recognizer.on('error', function(err) {
          return me.onBadLetter(socket, data);
        });
        recognizer.on('open', function(res) {
          var adr, cropped, item, r, ratio;
          r = recognizer.outerbounding();
          item = {
            rect: r
          };
          recognizer.getText(item);
          data.txt = recognizer.texts;
          data.zipCode = "";
          data.town = "";
          data.street = "";
          data.housenumber = "";
          data.housenumberExtension = "";
          if (data.txt.length > 0) {
            adr = recognizer.getAddress(data.txt[0]);
            data.adr = adr;
            data.zipCode = adr.zipCode;
            data.town = adr.town;
            data.street = adr.street;
            data.housenumber = adr.housenumber;
            data.housenumberExtension = adr.housenumberExtension;
          }
          cropped = recognizer.image.crop(r.x, r.y, r.width, r.height);
          cropped.rotate(270);
          if (typeof socket.mywidth === 'number') {
            ratio = socket.mywidth / r.width;
            cropped.resize(r.height * ratio, r.width * ratio);
          }
          return cropped.toBufferAsync(function(err, buffer) {
            var inlineimage;
            inlineimage = "data:image/jpeg;base64," + buffer.toString('base64');
            data.inlineimage = inlineimage;
            return socket.emit('letter', data);
          });
        });
        return recognizer.open(name, false);
      }
    };

    return IO;

  })(EventEmitter);

}).call(this);
