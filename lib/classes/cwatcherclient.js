(function() {
  var CWatcherClient, DB, EventEmitter, Recognizer, fs, path, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  fs = require('fs');

  variables = require('../variables');

  DB = require('./db');

  Recognizer = require('./recognizer');

  module.exports = CWatcherClient = (function(superClass) {
    extend(CWatcherClient, superClass);

    function CWatcherClient(cluster, pathName, filename, processlist) {
      var me;
      this.cluster = cluster;
      this.pathname = pathName;
      this.filename = filename;
      this.processlist = processlist;
      this.setBadPath(path.join(this.pathname, 'bad'));
      this.setGoodPath(path.join(this.pathname, 'good'));
      this.setNoAddressPath(path.join(this.pathname, 'noaddress'));
      this.setNoCodePath(path.join(this.pathname, 'nocode'));
      me = this;
      this.db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
      this.db.setLimit(100);
      this.db.on('updated', (function(_this) {
        return function(num) {
          return _this.onDBUpdated(num);
        };
      })(this));
      this.db.on('error', function(err) {
        me.emit('error', err.code);
        return me.emit('stoped');
      });
      this.scan();
    }

    CWatcherClient.prototype.setNoCodePath = function(path) {
      return this.nocodePath = path;
    };

    CWatcherClient.prototype.setGoodPath = function(path) {
      return this.goodPath = path;
    };

    CWatcherClient.prototype.setNoAddressPath = function(path) {
      return this.noaddressPath = path;
    };

    CWatcherClient.prototype.setBadPath = function(path) {
      return this.badPath = path;
    };

    CWatcherClient.prototype.scan = function() {
      var file, me;
      me = this;
      file = path.join(me.pathname, me.filename);
      return fs.stat(file, function(err, stat) {
        var now;
        if (err) {
          return me.emit('stoped');
        } else {
          me.current_stat = stat;
          now = new Date;
          now.setSeconds(now.getSeconds() - 1);
          if (stat.ctime < now) {
            me.recognizer = new Recognizer(me.db, me.processlist);
            me.recognizer.setDebug(me.debug);
            me.recognizer.on('error', function(err) {
              return fs.writeFile(path.join(me.badPath, me.filename + '.txt'), JSON.stringify(err, null, 2), function(err) {
                if (err) {
                  me.emit('error', err);
                }
                return fs.rename(file, path.join(me.badPath, me.filename), function(err) {
                  if (err) {
                    me.emit('error', err);
                  }
                  return me.emit('stoped');
                });
              });
            });
            me.recognizer.on('open', function(res) {
              me.recognizer.barcode();
              return me.recognizer.sortbox();
            });
            me.recognizer.on('boxes', function(res, codes) {
              var e, name;
              if (codes.length === 0) {
                return me.fullScann(codes, 'nocode');
              } else {
                if (res.length === 0 || typeof res[0].box === 'undefined' || res[0].box.length === 0) {
                  return me.fullScann(codes, 'noaddress');
                } else if (res.length === 1) {
                  name = res[0].codes.join('.');
                  try {
                    fs.unlinkSync(path.join(me.goodPath, name + path.extname(file)));
                  } catch (_error) {
                    e = _error;
                  }
                  return fs.rename(file, path.join(me.goodPath, name + path.extname(file)), function(err) {
                    debug('good move', file + '->' + path.join(me.noaddressPath, name + path.extname(file)));
                    if (err) {
                      me.emit('error', err);
                      return me.emit('stoped');
                    } else {
                      debug('put', res);
                      process.send(res[0]);
                      return me.emit('stoped');
                    }
                  });
                }
              }
            });
            return me.recognizer.open(path.join(me.pathname, me.filename));
          } else {
            debug('CWatcherClient', 'file too young');
            return me.emit('stoped');
          }
        }
      });
    };

    CWatcherClient.prototype.fullScann = function(codes, failpath) {
      var file, me;
      me = this;
      file = path.join(me.pathname, me.filename);
      debug('fullscann', file, 'failpath', failpath);
      this.recognizer = new Recognizer;
      this.recognizer.setDebug(false);
      this.recognizer.on('error', function(err) {
        return me.emit('stoped');
      });
      this.recognizer.on('open', function(res) {
        return me.recognizer.barcodeOriginal(function(codes) {
          var adr, data, item, r;
          r = me.recognizer.outerbounding();
          item = {
            rect: r
          };
          me.recognizer.getText(item);
          data = {
            codes: codes
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
          me.recognizer.addresses.push(data);
          return me.recognizer.sortboxAfterText();
        });
      });
      this.recognizer.once('boxes', function(boxes, codes) {
        var e, name, ref;
        name = codes.join('.');
        if (boxes.length > 0 && codes.length > 0 && ((ref = boxes[0].box) != null ? ref.length : void 0) > 0) {
          boxes[0].codes = codes;
          try {
            fs.unlinkSync(path.join(me.goodPath, name + path.extname(file)));
          } catch (_error) {
            e = _error;
          }
          return fs.rename(file, path.join(me.goodPath, name + path.extname(file)), function(err) {
            debug('good* move', file + '->' + path.join(me.noaddressPath, name + path.extname(file)));
            if (err) {
              me.emit('error', err);
            } else {
              process.send(boxes[0]);
            }
            return me.emit('stoped');
          });
        } else {
          if (failpath === 'nocode') {
            name = (new Date()).getTime();
            try {
              fs.unlinkSync(path.join(me.nocodePath, name + path.extname(file)));
            } catch (_error) {
              e = _error;
            }
            return fs.rename(file, path.join(me.nocodePath, name + path.extname(file)), function(err) {
              debug(failpath + ' move', file + '->' + path.join(me.noaddressPath, name + path.extname(file)));
              if (err) {
                me.emit('error', err);
              }
              return me.emit('stoped');
            });
          } else {
            try {
              fs.unlinkSync(path.join(me.noaddressPath, name + path.extname(file)));
            } catch (_error) {
              e = _error;
            }
            return fs.rename(file, path.join(me.noaddressPath, name + path.extname(file)), function(err) {
              var box, item;
              debug(failpath + ' move', file + '->' + path.join(me.noaddressPath, name + path.extname(file)));
              if (err) {
                me.emit('error', err);
              } else {
                box = {
                  sortiergang: 'NA',
                  sortierfach: 'NA',
                  strid: -1,
                  mandant: null,
                  regiogruppe: null,
                  bereich: 'NA',
                  plz: '',
                  ort: '',
                  ortsteil: '',
                  hnvon: '',
                  hnbis: '',
                  gerade: '',
                  ungerade: '',
                  strasse: ''
                };
                item = {
                  name: "",
                  street: "",
                  housenumber: "",
                  housenumberExtension: "",
                  flatNumber: "",
                  zipCode: "",
                  town: "",
                  state: true,
                  message: "",
                  box: [box],
                  codes: codes,
                  ocr_street: '',
                  ocr_zipCode: '',
                  ocr_town: '',
                  district: ''
                };
                process.send(item);
                console.log('noaddress', boxes);
              }
              return me.emit('stoped');
            });
          }
        }
      });
      return this.recognizer.open(file, false);
    };

    return CWatcherClient;

  })(EventEmitter);

}).call(this);
