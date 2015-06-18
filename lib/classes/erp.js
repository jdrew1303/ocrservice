(function() {
  var ERP, EventEmitter, request,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  request = require('request');

  EventEmitter = require('events').EventEmitter;

  module.exports = ERP = (function(superClass) {
    extend(ERP, superClass);

    function ERP(options) {
      this.options = options;
      this.sid = '';
    }

    ERP.prototype.login = function() {
      var opt;
      if (this.sid !== '') {
        this.logout();
      }
      opt = {
        url: this.options.url,
        formData: {
          "return": 'json',
          TEMPLATE: 'NO',
          mandant: this.options.client,
          username: this.options.login,
          password: this.options.password
        }
      };
      return request.post(opt, (function(_this) {
        return function(err, httpResponse, body) {
          return _this.onLoginResponse(err, httpResponse, body);
        };
      })(this));
    };

    ERP.prototype.onLoginResponse = function(err, httpResponse, body) {
      var json;
      if (err) {
        return this.emit('loginError', err);
      } else {
        json = JSON.parse(body);
        if (json.success === true) {
          this.sid = json.sid;
          return this.emit('loginSuccess', json.sid);
        } else {
          return this.emit('loginError', body);
        }
      }
    };

    ERP.prototype.logout = function() {
      request.get(this.options.url + '?TEMPLATE=NO&sid=' + this.sid + '&cmp=cmp_logout');
      this.sid = '';
      return this.emit('logged out');
    };

    ERP.prototype.getFastAccessTour = function() {};

    ERP.prototype.put = function(sending, item) {
      var data, options, today;
      if (this.sid !== '') {
        today = new Date;
        data = [];
        data.push({
          name: "Barcode",
          wert: sending.id
        });
        data.push({
          name: "Strasse",
          wert: item.street
        });
        data.push({
          name: "HN",
          wert: item.houseNumber
        });
        data.push({
          name: "PLZ",
          wert: item.zipCode
        });
        data.push({
          name: "Ort",
          wert: item.town
        });
        data.push({
          name: "Name",
          wert: item.name
        });
        options = {
          url: this.options.url,
          formData: {
            sid: this.sid,
            TEMPLATE: 'NO',
            cmp: 'cmp_sv_web_erfassung',
            page: "ajax/save",
            limit: 100000,
            start: 0,
            regiogruppe: 'Zustellung',
            modell: 'Standardbriefsendungen',
            sortiergang: sending.sg,
            data: JSON.stringify(data, null, 0)
          }
        };
        return request.post(options, (function(_this) {
          return function(err, httpResponse, body) {
            return _this.onPutResponse(err, httpResponse, body);
          };
        })(this));
      } else {
        return this.emit('error', 'no logged in');
      }
    };

    ERP.prototype.onPutResponse = function(err, httpResponse, body) {
      var e, json;
      if (err) {
        return this.emit('error', err);
      } else {
        try {
          json = JSON.parse(body);
          if (json.success === true) {
            return this.emit('put', json.results);
          } else {
            return this.emit('error', body);
          }
        } catch (_error) {
          e = _error;
          return this.emit('error', e);
        }
      }
    };

    return ERP;

  })(EventEmitter);

}).call(this);
