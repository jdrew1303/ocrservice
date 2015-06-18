(function() {
  var ERP, EventEmitter, IO, Regonizer, cv, fs, glob, path, socketIO, updfindme, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  fs = require('fs');

  glob = require('glob');

  socketIO = require('socket.io');

  variables = require('../variables');

  Regonizer = require('../classes/regonizer');

  ERP = require('../classes/erp');

  cv = require('opencv');

  updfindme = require('updfindme');

  module.exports = IO = (function(superClass) {
    extend(IO, superClass);

    function IO(pathName) {
      var discoverMessage, discoverServer;
      this.io = socketIO();
      this.io.on('connection', (function(_this) {
        return function(opt) {
          return _this.onIncommingConnection(opt);
        };
      })(this));
      this.pathAddition = 'noaddress';
      discoverServer = new updfindme.Server(parseInt(variables.UI_DISCOVER_PORT));
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
      socket.on('disconnect', function(data) {
        return me.onDisconnect(socket, data);
      });
      socket.on('work', function(data) {
        return me.onWork(socket, data);
      });
      socket.on('login', function(data) {
        return me.onLogin(socket, data);
      });
      return socket.on('setbad', function(data) {
        return me.onSetBad(socket, data);
      });
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
      console.log('onIncommingConnection', socket.id);
      this.clients[socket.id] = socket;
      this.initSocketEvents(socket);
      return socket.emit('loginRequired');
    };

    IO.prototype.onDisconnect = function(socket) {
      if (this.clients[socket.id].erp != null) {
        this.clients[socket.id].erp.logout();
      }
      delete this.clients[socket.id];
      return console.log('onDisconnect');
    };

    IO.prototype.onLogin = function(socket, data) {
      var me, options;
      me = this;
      options = {
        url: variables.ERP_URL,
        client: variables.ERP_CLIENT,
        login: data.login,
        password: data.password
      };
      socket.erp = new ERP(options);
      socket.erp.on('loginSuccess', function(sid) {
        return me.sendLetter(socket);
      });
      socket.erp.on('loginError', function(error) {
        return socket.emit('loginError', error);
      });
      return socket.erp.login();
    };

    IO.prototype.onSetBad = function(socket, data) {
      var file, me;
      me = this;
      file = path.join(me.pathName, me.pathAddition, data.id + '.tiff');
      fs.writeFile(path.join(me.pathName, 'bad', path.basename(file) + '.txt'), JSON.stringify(data, null, 2), function(err) {
        if (err) {
          return me.emit('error', err);
        }
      });
      fs.rename(file, path.join(me.pathName, 'bad', path.basename(file)), function(err) {
        if (err) {
          return me.emit('error', err);
        }
      });
      return me.sendLetter(socket);
    };

    IO.prototype.sendLetter = function(socket) {
      var data, me, name, regonizer;
      me = this;
      data = {
        id: this.sendings.pop()
      };
      if (this.sendings.length === 0) {
        this.updateList();
      }
      name = path.join(me.pathName, me.pathAddition, data.id + '.tiff');
      regonizer = new Regonizer;
      regonizer.setDebug(false);
      regonizer.on('error', function(err) {
        console.log(err);
        return socket.emit('letter', data);
      });
      regonizer.on('open', function(res) {
        var adr, cropped, item, r;
        r = regonizer.outerbounding();
        item = {
          rect: r
        };
        regonizer.getText(item);
        data.txt = regonizer.texts;
        data.zipCode = "";
        data.town = "";
        data.street = "";
        data.housenumber = "";
        data.housenumberExtension = "";
        if (data.txt.length > 0) {
          adr = regonizer.getAddress(data.txt[0]);
          data.adr = adr;
          data.zipCode = adr.zipCode;
          data.town = adr.town;
          data.street = adr.street;
          data.housenumber = adr.housenumber;
          data.housenumberExtension = adr.housenumberExtension;
        }
        cropped = regonizer.image.crop(r.x, r.y, r.width, r.height);
        cropped.rotate(270);
        return cropped.toBufferAsync(function(err, buffer) {
          var inlineimage;
          inlineimage = "data:image/jpeg;base64," + buffer.toString('base64');
          data.inlineimage = inlineimage;
          return socket.emit('letter', data);
        });
      });
      return regonizer.open(name);
    };

    IO.prototype.onWork = function(socket, data) {
      var id, me, name, regonizer;
      console.log('work', data);
      me = this;
      for (id in me.clients) {
        if (socket.id !== id) {
          me.clients[id].emit('work', data);
        }
      }
      name = path.join(me.pathName, 'noaddress', data.id + '.tiff');
      regonizer = new Regonizer;
      regonizer.setDebug(false);
      regonizer.on('error', function(err) {
        return socket.emit('do', data);
      });
      regonizer.on('open', function(res) {
        var cropped, r;
        r = regonizer.outerbounding();
        cropped = regonizer.image.crop(r.x, r.y, r.width, r.height);
        cropped.rotate(270);
        return cropped.toBufferAsync(function(err, buffer) {
          var inlineimage;
          inlineimage = "data:image/jpeg;base64," + buffer.toString('base64');
          data.inlineimage = inlineimage;
          return socket.emit('do', data);
        });
      });
      return regonizer.open(name);
    };

    return IO;

  })(EventEmitter);

}).call(this);
