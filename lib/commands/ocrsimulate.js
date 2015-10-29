(function() {
  var Command, DB, ERP, OCRSimulate, Recognizer, cluster, fs, glob, path, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  cluster = require('cluster');

  glob = require('glob');

  path = require('path');

  fs = require('fs');

  ERP = require('../classes/erp');

  DB = require('../classes/db');

  Recognizer = require('../classes/recognizer');

  module.exports = OCRSimulate = (function(superClass) {
    extend(OCRSimulate, superClass);

    function OCRSimulate() {
      return OCRSimulate.__super__.constructor.apply(this, arguments);
    }

    OCRSimulate.commandName = 'ocrsimulate';

    OCRSimulate.commandArgs = ['row', 'box'];

    OCRSimulate.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    OCRSimulate.commandShortDescription = 'start the path cluster watching service';

    OCRSimulate.help = function() {
      return "";
    };

    OCRSimulate.prototype.action = function(program, options) {
      this.row = options.row;
      this.box = options.box;
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
      return debug('cmaster', 'wait for erp');
    };

    OCRSimulate.prototype.onERPConnect = function(msg) {
      debug('erp login', '---');
      return this.erp.login();
    };

    OCRSimulate.prototype.onERPDisconnect = function() {
      debug('erp disconnect', '---');
      return this.run = false;
    };

    OCRSimulate.prototype.onERPLoginError = function(msg) {
      return console.log(msg);
    };

    OCRSimulate.prototype.onERPLoginSuccess = function(msg) {
      debug('simulate', 'login success');
      return this.send();
    };

    OCRSimulate.prototype.onERPPut = function(msg) {
      return setTimeout(this.send.bind(this), 5000);
    };

    OCRSimulate.prototype.onERPFastAccess = function(list) {};

    OCRSimulate.prototype.onERPError = function(msg) {
      return console.error(msg);
    };

    OCRSimulate.prototype.send = function() {
      var box, codes, item;
      codes = [(new Date()).getTime()];
      box = {
        sortiergang: this.row,
        sortierfach: this.box,
        strid: -1,
        mandant: null,
        regiogruppe: null,
        bereich: 'NA',
        plz: '99999',
        ort: 'Musterhausen',
        ortsteil: '',
        hnvon: '0000',
        hnbis: '1000',
        gerade: '1',
        ungerade: '1',
        strasse: 'Musterweg'
      };
      item = {
        name: "Max Muster",
        street: "Musterweg",
        housenumber: "1",
        housenumberExtension: "a",
        flatNumber: "",
        zipCode: "99999",
        town: "Musterhausen",
        state: true,
        message: "",
        box: [box],
        codes: codes,
        ocr_street: '',
        ocr_zipCode: '',
        ocr_town: '',
        district: ''
      };
      info('send', codes.join(','));
      return this.erp.put(item);
    };

    return OCRSimulate;

  })(Command);

}).call(this);
