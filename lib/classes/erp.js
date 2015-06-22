(function() {
  var ERP, EventEmitter, client, request, udpfindme,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  request = require('request');

  EventEmitter = require('events').EventEmitter;

  udpfindme = require('udpfindme');

  client = require('socket.io-client');

  module.exports = ERP = (function(superClass) {
    extend(ERP, superClass);

    function ERP(options) {
      this.options = options;
      this.sid = '';
      this.discovery = new udpfindme.Discovery(31112);
      this.discovery.on('found', (function(_this) {
        return function(data, remote) {
          return _this.onDiscoveryFound(data, remote);
        };
      })(this));
      this.discovery.on('timeout', (function(_this) {
        return function() {
          return _this.onDiscoveryTimout();
        };
      })(this));
      this.discovery.discover();
    }

    ERP.prototype.onDiscoveryFound = function(data, remote) {
      var ref;
      if (typeof data.type === 'string') {
        if (data.type === 'erp') {
          this.url = 'http://' + remote.address + ':' + data.port + '/';
          if (!((ref = this.erp) != null ? ref.connected : void 0)) {
            return this.setIoConnectTimer();
          }
        }
      }
    };

    ERP.prototype.onDiscoveryTimout = function() {
      return this.discovery.discover();
    };

    ERP.prototype.setIoConnectTimer = function() {
      if (typeof this.ioConnectTimer !== 'undefined') {
        clearTimeout(this.ioConnectTimer);
      }
      return this.ioConnectTimer = setTimeout(this.setErp.bind(this), 1000);
    };

    ERP.prototype.setErp = function() {
      var opt, ref;
      debug('io connect', (ref = this.erp) != null ? ref.connected : void 0);
      opt = {
        autoConnect: false
      };
      this.erp = client(this.url, opt);
      debug('start', 'set up io ' + this.url + '');
      this.erp.on('connect_error', (function(_this) {
        return function(err) {
          return _this.onConnectError(_this.erp, err);
        };
      })(this));
      this.erp.on('connect', (function(_this) {
        return function(socket) {
          return _this.onConnect(socket);
        };
      })(this));
      this.erp.on('disconnect', (function(_this) {
        return function(socket) {
          return _this.onDisconnect(socket);
        };
      })(this));
      this.erp.on('login', (function(_this) {
        return function(data) {
          return _this.onLogin(_this.erp, data);
        };
      })(this));
      this.erp.on('logout', (function(_this) {
        return function(data) {
          return _this.onLogout(_this.erp, data);
        };
      })(this));
      this.erp.on('put', (function(_this) {
        return function(data) {
          return _this.onPut(_this.erp, data);
        };
      })(this));
      return this.erp.connect();
    };

    ERP.prototype.onConnectError = function(socket, err) {
      this.erp.disconnect();
      return debug('connect_error', JSON.stringify(err, null, 0) + ' #' + this.erp.id + ' #' + socket.id);
    };

    ERP.prototype.onConnect = function() {
      return debug('connect', this.erp.id);
    };

    ERP.prototype.onDisconnect = function() {
      return debug('disconnect', this.erp.id);
    };

    ERP.prototype.login = function() {
      var opt;
      if (this.sid !== '') {
        this.logout();
      }
      opt = {
        client: this.options.client,
        login: this.options.login,
        password: this.options.password
      };
      if (typeof this.erp === 'object' && this.erp.connected === true) {
        return this.erp.emit('login', opt);
      } else {
        return this.emit('error', 'not connected');
      }
    };

    ERP.prototype.onLogin = function(socket, data) {
      this.sid = data;
      return this.emit('loginSuccess', data);
    };

    ERP.prototype.logout = function() {
      if (typeof this.erp === 'object' && this.erp.connected === true) {
        this.erp.emit('logout');
      }
      this.sid = '';
      return this.emit('logged out');
    };

    ERP.prototype.getFastAccessTour = function() {};

    ERP.prototype.put = function(item) {
      if (typeof this.erp === 'object' && this.erp.connected === true) {
        return this.erp.emit('put', item);
      } else {
        return this.emit('error', 'not connected');
      }
    };

    ERP.prototype.onPut = function(socket, data) {
      return this.emit('put', data);
    };

    return ERP;

  })(EventEmitter);

}).call(this);
