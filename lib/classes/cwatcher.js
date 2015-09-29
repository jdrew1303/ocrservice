(function() {
  var CWatcher, DB, ERP, EventEmitter, IO, Recognizer, fs, glob, path, socket, udpfindme, variables,
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

  module.exports = CWatcher = (function(superClass) {
    extend(CWatcher, superClass);

    function CWatcher(pathName) {}

    return CWatcher;

  })(EventEmitter);

}).call(this);
