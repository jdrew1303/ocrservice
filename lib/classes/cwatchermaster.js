(function() {
  var CWatcherMaster, DB, ERP, EventEmitter, IO, fs, glob, path, socket, udpfindme, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  fs = require('fs');

  glob = require('glob');

  IO = require('../classes/io');

  socket = require('socket.io-client');

  variables = require('../variables');

  DB = require('./db');

  ERP = require('./erp');

  udpfindme = require('udpfindme');

  module.exports = CWatcherMaster = (function(superClass) {
    extend(CWatcherMaster, superClass);

    function CWatcherMaster(cluster, pathName) {
      var me, options;
      this.intervalTimeout = 1000;
      this.debug = false;
      this.run = false;
      this.files = [];
      this.cluster = cluster;
      me = this;
      this.cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        return me.dispatchTask();
      });
      this.cluster.on('online', (function(_this) {
        return function(worker) {
          return _this.onWorkerOnline(worker);
        };
      })(this));
      this.pathname = pathName;
      this.cpuCount = require('os').cpus().length;
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
      debug('cmaster', 'wait for erp');
    }

    CWatcherMaster.prototype.onERPConnect = function(msg) {
      debug('erp login', '---');
      return this.erp.login();
    };

    CWatcherMaster.prototype.onERPDisconnect = function() {
      debug('erp disconnect', '---');
      return this.run = false;
    };

    CWatcherMaster.prototype.onERPLoginError = function(msg) {
      return console.log(msg);
    };

    CWatcherMaster.prototype.onERPLoginSuccess = function(msg) {
      this.erp.fastaccess();
      return debug('cmaster', 'login success');
    };

    CWatcherMaster.prototype.onERPPut = function(msg) {
      return process.nextTick(this.dispatchTask.bind(this));
    };

    CWatcherMaster.prototype.onERPFastAccess = function(list) {
      debug('cmaster', 'on fastaccess ' + list.length);
      return this.db.fastaccess(list);
    };

    CWatcherMaster.prototype.onERPError = function(msg) {
      return console.error(msg);
    };

    CWatcherMaster.prototype.onDBUpdated = function(num) {
      debug('updated', 'ready');
      return this.start();
    };

    CWatcherMaster.prototype.start = function() {
      var me;
      me = this;
      if (!this.run) {
        me.emit('start', true);
        this.run = true;
        return this.timer = setInterval(this.readDirectory.bind(this), 5000);
      }
    };

    CWatcherMaster.prototype.stop = function() {
      var me;
      me = this;
      if (this.run) {
        this.run = false;
        clearInterval(this.timer);
        me.emit('stop', true);
        if (this.io_client != null) {
          return true;
        }
      }
    };

    CWatcherMaster.prototype.onWorkerOnline = function(worker) {
      var me;
      me = this;
      if (me.files.length > 0) {
        worker.on('message', function(msg) {
          return me.erp.put(msg);
        });
        return worker.send(me.files.pop());
      } else {
        worker.kill();
        return console.log('no file anymore');
      }
    };

    CWatcherMaster.prototype.dispatchTask = function() {
      var count, me, results;
      me = this;
      if (me.files.length === 0) {
        return null;
      } else {
        count = 0;
        Object.keys(this.cluster.workers).forEach(function(id) {
          return count++;
        });
        results = [];
        while (count < this.cpuCount) {
          this.cluster.fork();
          results.push(count++);
        }
        return results;
      }
    };

    CWatcherMaster.prototype.readDirectory = function() {
      var count, me, options, pattern;
      count = 0;
      Object.keys(this.cluster.workers).forEach(function(id) {
        return count++;
      });
      debug('cmaster', 'readDirectory, active clients ' + count);
      if (this.run) {
        options = {
          cwd: this.pathname
        };
        pattern = variables.OCR_WATCH_PATTERN;
        me = this;
        return glob(pattern, options, function(err, matches) {
          me.files = matches;
          return me.dispatchTask();
        });
      }
    };

    return CWatcherMaster;

  })(EventEmitter);

}).call(this);
