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

    function IO() {
      var discoverMessage, discoverServer, options;
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
      options = {
        key: 'io',
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

    IO.prototype.onERPConnect = function(msg) {
      debug('erp login', '---');
      return this.erp.login();
    };

    IO.prototype.onERPDisconnect = function() {
      debug('erp disconnect', '---');
      return this.run = false;
    };

    IO.prototype.onERPLoginError = function(msg) {
      return console.log(msg);
    };

    IO.prototype.onERPLoginSuccess = function(msg) {
      debug('cmaster', 'login success');
      return this.emit('listen');
    };

    IO.prototype.onERPPut = function(msg) {
      return process.nextTick(this.dispatchTask.bind(this));
    };

    IO.prototype.onERPError = function(msg) {
      return console.error(msg);
    };

    IO.prototype.close = function() {
      return this.io.close();
    };

    IO.prototype.setPath = function(noaddress, goodpath, badpath) {
      this.noAddressPathName = noaddress;
      this.goodPathName = goodpath;
      this.badPathName = badpath;
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
      socket.on('size', (function(_this) {
        return function(data) {
          return _this.onSize(socket, data);
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
      socket.on('empty', (function(_this) {
        return function(data) {
          return _this.onEmpty(socket, data);
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
          cwd: path.join(me.noAddressPathName)
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

    IO.prototype.onSize = function(socket, data) {
      socket.mywidth = data.width;
      socket.myheight = data.height;
      return debug('onSize', data);
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
      socket.emit('loginSuccess', this.erp.sid);
      return this.sendLetter(socket);
    };

    IO.prototype.onBadLetter = function(socket, data) {
      var file, me;
      me = this;
      file = path.join(me.noAddressPathName, data.id + '.tiff');
      fs.exists(file, function(exists) {
        if (exists === true) {
          fs.writeFile(path.join(me.badPathName, path.basename(file) + '.txt'), JSON.stringify(data, null, 2), function(err) {
            if (err) {
              return me.emit('error', err);
            }
          });
          return fs.rename(file, path.join(me.badPathName, path.basename(file)), function(err) {
            if (err) {
              return me.emit('error', err);
            }
          });
        }
      });
      return me.sendLetter(socket);
    };

    IO.prototype.onEmpty = function(socket, data) {
      return this.sendLetter(socket, data);
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
      file = path.join(me.noAddressPathName, data.id + '.tiff');
      fs.exists(file, function(exists) {
        if (exists === true) {
          return fs.rename(file, path.join(me.goodPathName, path.basename(file)), function(err) {
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
      return me.erp.put(item);
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
        name = path.join(me.noAddressPathName, data.id + '.tiff');
        recognizer = new Recognizer;
        recognizer.setDebug(false);
        recognizer.on('error', function(err) {
          return me.onBadLetter(socket, data);
        });
        recognizer.on('open', function(res) {
          var adr, cropped, item, r, ratio, ratioH, ratioW;
          r = recognizer.outerbounding();
          item = {
            rect: r
          };
          recognizer.barcode();
          recognizer.getText(item);
          data.codes = recognizer.barcodes;
          data.txt = recognizer.texts;
          data.zipCode = "";
          data.town = "";
          data.street = "";
          data.housenumber = "";
          data.housenumberExtension = "";
          if (data.txt.length > 0) {
            adr = recognizer.getAddress(data.txt[0], true);
            data.adr = adr;
            data.zipCode = adr.zipCode;
            data.town = adr.town;
            data.street = adr.street;
            data.housenumber = adr.housenumber;
            data.housenumberExtension = adr.housenumberExtension;
          }
          cropped = recognizer.image.crop(r.x, r.y, r.width, r.height);
          cropped.rotate(270);
          cropped.brightness - 30;
          cropped.equalizeHist();
          if (typeof socket.mywidth === 'number') {
            ratioW = socket.mywidth / r.width;
            ratioH = socket.myheight / r.height;
            ratio = Math.max(ratioW, ratioH);
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
