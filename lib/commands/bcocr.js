(function() {
  var CBcOcr, CBcOcrMaster, Command, DB, Extract, Recognizer, cluster, fs, glob, moveFile, nodeModuleCache, path, spawn, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  nodeModuleCache = require('fast-boot');

  Command = require('./command');

  variables = require('../variables');

  cluster = require('cluster');

  glob = require('glob');

  path = require('path');

  fs = require('fs');

  CBcOcrMaster = require('../classes/cbcocrmaster');

  DB = require('../classes/db');

  Extract = require('../classes/extract');

  Recognizer = require('../classes/recognizer');

  spawn = require('child_process').spawn;

  moveFile = function(orig, dest, cb) {
    var source;
    if (fs.existsSync(orig)) {
      source = fs.createReadStream(orig);
      dest = fs.createWriteStream(dest);
      source.pipe(dest);
      source.on('end', function() {
        fs.unlinkSync(orig);
        return cb(null);
      });
      return source.on('error', cb);
    } else {
      return cb(null);
    }
  };

  module.exports = CBcOcr = (function(superClass) {
    extend(CBcOcr, superClass);

    function CBcOcr() {
      return CBcOcr.__super__.constructor.apply(this, arguments);
    }

    CBcOcr.commandName = 'bcocr';

    CBcOcr.commandArgs = ['source'];

    CBcOcr.options = [
      {
        parameter: "-l,--processlist [processlist]",
        description: "json process instruction list"
      }, {
        parameter: "--noaddress [noaddress]",
        description: "path for no address"
      }, {
        parameter: "--nocode [nocode]",
        description: "path for no code"
      }, {
        parameter: "--good [good]",
        description: "path for good"
      }, {
        parameter: "--bad [bad]",
        description: "path for bad"
      }, {
        parameter: "--bardecode",
        description: "use bardecode"
      }, {
        parameter: "--quick",
        description: "quickstart no db update"
      }, {
        parameter: "-c,--cpus [cpus]",
        description: "how much cpus used for"
      }, {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    CBcOcr.commandShortDescription = 'start the path cluster watching service';

    CBcOcr.help = function() {
      return "";
    };

    CBcOcr.prototype.action = function(program, options) {
      var box, cmaster, codes, e, exitfn, item, me;
      console.time('elapsed');
      this.codes = [];
      try {
        this.processlist = require(program.processlist);
      } catch (_error) {
        e = _error;
      }
      this.pathname = options.source;
      this.bad = path.join(this.pathname, 'bad');
      this.goodPath = path.join(this.pathname, 'good');
      this.noAddressPath = path.join(this.pathname, 'noaddress');
      this.noCodePath = path.join(this.pathname, 'nocode');
      if (program.noaddress) {
        this.noAddressPath = program.noaddress;
      }
      if (program.good) {
        this.goodPath = program.good;
      }
      if (program.nocode) {
        this.noCodePath = program.nocode;
      }
      if (program.bad) {
        this.bad = program.bad;
      }
      this.debug = false;
      if (program.debug) {
        this.debug = true;
      }
      this.usebardecode = false;
      if (program.barcode) {
        this.usebardecode = true;
      }
      codes = [];
      box = {
        sortiergang: 'NA',
        sortierfach: 'NA',
        strid: -1,
        mandant: '6575',
        regiogruppe: 'Standardbriefsendungen',
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
      if (cluster.isMaster) {
        return cmaster = new CBcOcrMaster(cluster, options.source, program.cpus, program.quick);
      } else {
        exitfn = function() {
          return process.exit();
        };
        setTimeout(exitfn, 60000);
        me = this;
        return process.on('message', function(msg) {
          me.filename = path.join(this.pathname, msg);
          if (!fs.existsSync(this.filename)) {
            process.exit();
          }
          return me.zbarimg();
        });
      }
    };

    CBcOcr.prototype.zbarimg = function() {
      var zb;
      zb = spawn('zbarimg', ['-q', this.filename]);
      zb.stdout.on('data', (function(_this) {
        return function(data) {
          return _this.onZBarImage(data);
        };
      })(this));
      return zb.stderr.on('data', (function(_this) {
        return function(data) {
          return _this.onZBarImageError(data);
        };
      })(this));
    };

    CBcOcr.prototype.bardecode = function() {
      var bd;
      if (this.usebardecode && this.codes.length === 0) {
        bd = spawn('bardecode', ['-c', '8', '-d', '8', this.filename]);
        bd.stdout.on('data', (function(_this) {
          return function(data) {
            return _this.onBarDecode(data);
          };
        })(this));
        return bd.stderr.on('data', (function(_this) {
          return function(data) {
            return _this.onBarDecodeError(data);
          };
        })(this));
      } else {
        return this.tesseract();
      }
    };

    CBcOcr.prototype.tesseract = function() {
      var ts;
      if (this.codes.length === 0) {
        return this.onNoCode();
      } else {
        ts = spawn('tesseract', ['-l', 'deu', '-psm', '1', this.filename, 'stdout']);
        ts.on('data', (function(_this) {
          return function(data) {
            return _this.onTesseract(data);
          };
        })(this));
        ts.stdout.on('data', (function(_this) {
          return function(data) {
            return _this.onTesseract(data);
          };
        })(this));
        return ts.stderr.on('data', (function(_this) {
          return function(data) {
            return _this.onTesseractError(data);
          };
        })(this));
      }
    };

    CBcOcr.prototype.getZBCode = function(l) {
      var p;
      p = l.split(':');
      if (p.length === 2) {
        if (p[0] === 'I2/5') {
          p[1] = p[1].substring(0, p[1].length - 1);
        }
        return p[1];
      }
    };

    CBcOcr.prototype.onZBarImage = function(data) {
      var i, len, line, lines;
      lines = data.toString().split(/\n/);
      for (i = 0, len = lines.length; i < len; i++) {
        line = lines[i];
        if (line.indexOf(':') > 0) {
          this.codes.push(this.getZBCode(line));
        }
      }
      return this.bardecode();
    };

    CBcOcr.prototype.onZBarImageError = function(data) {
      return console.log(data.toString());
    };

    CBcOcr.prototype.getBDCode = function(l) {
      var p;
      p = l.split(/\s\[/);
      if (p.length === 2) {
        if (p[1].indexOf('code25i')) {
          p[0] = p[0].substring(0, p[0].length - 1);
        }
        return p[0];
      }
    };

    CBcOcr.prototype.onBarDecode = function(data) {
      var i, len, line, lines;
      console.log('using bardecode', data.toString());
      lines = data.toString().split(/\n/);
      for (i = 0, len = lines.length; i < len; i++) {
        line = lines[i];
        this.codes.push(this.getBDCode(line));
      }
      console.log('bardecode result', this.codes);
      return this.tesseract();
    };

    CBcOcr.prototype.onBarDecodeError = function(data) {
      return console.log(data.toString());
    };

    CBcOcr.prototype.onTesseract = function(data) {
      var exctract, ocrtext;
      ocrtext = data.toString();
      exctract = new Extract;
      this.adressObject = exctract.extractAddress(ocrtext);
      this.adressObject.ocr_text = ocrtext;
      this.db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
      if (this.adressObject.street === '') {
        this.recognizer = new Recognizer(this.db, this.processlist);
        this.recognizer.setDebug(this.debug || false);
        this.recognizer.on('error', function(err) {
          throw err;
        });
        this.recognizer.on('open', (function(_this) {
          return function(res) {
            return _this.recognizer.run(res);
          };
        })(this));
        this.recognizer.on('boxes', (function(_this) {
          return function(adrs, codes) {
            return _this.onRegonizer(adrs, codes);
          };
        })(this));
        return this.recognizer.open(this.filename, true);
      } else {
        return this.dbfind();
      }
    };

    CBcOcr.prototype.dbfind = function() {
      this.db.on('ocrhash', (function(_this) {
        return function(rows) {
          return _this.onOcrhash(rows);
        };
      })(this));
      this.db.on('sortbox', (function(_this) {
        return function(box) {
          return _this.onSortbox(box);
        };
      })(this));
      return this.db.findText([this.adressObject.street, this.adressObject.zipCode, this.adressObject.town].join(' '));
    };

    CBcOcr.prototype.onRegonizer = function(adrs, codes) {
      if (adrs.length > 0) {
        this.adressObject = {
          name: adrs[0].name,
          street: adrs[0].street,
          housenumber: adrs[0].housenumber,
          housenumberExtension: adrs[0].housenumberExtension,
          flatNumber: adrs[0].flatNumber,
          zipCode: adrs[0].zipCode,
          town: adrs[0].town,
          state: adrs[0].state,
          message: adrs[0].message,
          ocr_street: adrs[0].ocr_street,
          ocr_zipCode: adrs[0].ocr_zipCode,
          ocr_town: adrs[0].ocr_town,
          district: adrs[0].district
        };
        if (adrs[0].box.length > 0) {
          this.box = {
            strid: adrs[0].box[0].strid,
            mandant: adrs[0].box[0].mandant,
            regiogruppe: adrs[0].box[0].regiogruppe,
            bereich: adrs[0].box[0].bereich,
            sortiergang: adrs[0].box[0].sortiergang,
            sortierfach: adrs[0].box[0].sortierfach,
            plz: adrs[0].box[0].plz,
            ort: adrs[0].box[0].ort,
            ortsteil: adrs[0].box[0].ortsteil,
            hnvon: adrs[0].box[0].hnvon,
            hnbis: adrs[0].box[0].hnbis,
            zuvon: adrs[0].box[0].zuvon,
            zubis: adrs[0].box[0].zubis,
            gerade: adrs[0].box[0].gerade,
            ungerade: adrs[0].box[0].ungerade,
            strasse: adrs[0].box[0].strasse
          };
          return this.onGood();
        } else {
          return this.onNoBox();
        }
      } else {
        return this.onNoAddress();
      }
    };

    CBcOcr.prototype.onTesseractError = function(data) {};

    CBcOcr.prototype.onOcrhash = function(rows) {
      if (rows.length > 0) {
        return this.db.findSortbox(rows[0].ids, this.adressObject.housenumber);
      } else {
        return this.onNoBox();
      }
    };

    CBcOcr.prototype.onSortbox = function(box) {
      if (box.length === 0) {
        this.onNoBox();
      } else if (box.length === 1) {
        this.box = {
          strid: box[0].strid,
          mandant: box[0].mandant,
          regiogruppe: box[0].regiogruppe,
          bereich: box[0].bereich,
          sortiergang: box[0].sortiergang,
          sortierfach: box[0].sortierfach,
          plz: box[0].plz,
          ort: box[0].ort,
          ortsteil: box[0].ortsteil,
          hnvon: box[0].hnvon,
          hnbis: box[0].hnbis,
          zuvon: box[0].zuvon,
          zubis: box[0].zubis,
          gerade: box[0].gerade,
          ungerade: box[0].ungerade,
          strasse: box[0].strasse
        };
        this.onGood();
      } else {
        this.onMoreBoxes();
      }
      return this.db.connection.end();
    };

    CBcOcr.prototype.onNoCode = function() {
      console.log('No Code');
      console.timeEnd('elapsed');
      return process.exit();
    };

    CBcOcr.prototype.onNoAddress = function() {
      console.log('No Address');
      console.timeEnd('elapsed');
      return process.exit();
    };

    CBcOcr.prototype.onNoBox = function() {
      console.log('NT');
      console.timeEnd('elapsed');
      return process.exit();
    };

    CBcOcr.prototype.onGood = function() {
      console.log('OK');
      console.log('onGood', this.adressObject);
      console.log('onGood', this.box);
      console.timeEnd('elapsed');
      return process.exit();
    };

    CBcOcr.prototype.onMoreBoxes = function() {
      console.log('unclear');
      console.timeEnd('elapsed');
      return process.exit();
    };

    return CBcOcr;

  })(Command);

}).call(this);
