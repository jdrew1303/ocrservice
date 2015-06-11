(function() {
  var DB, EventEmitter, Extract, OCR, Regonizer, colorList, contourRanking, cv, lengthRanking, variables, xocr,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  variables = require('../variables');

  cv = require('opencv');

  OCR = require('wocr').OCR;

  Extract = require('./extract');

  DB = require('../classes/db');

  xocr = new OCR();

  xocr.Init(variables.OCR_LANGUAGE);

  colorList = [[0, 255, 0], [255, 255, 255], [0, 0, 255], [0, 255, 255], [255, 255, 10], [100, 255, 255], [100, 155, 255], [100, 155, 155]];

  contourRanking = function(a, b) {
    var base, base1;
    return typeof (base = a.abs < b.abs) === "function" ? base({
      1: typeof (base1 = a.abs > b.abs) === "function" ? base1(-{
        1: 0
      }) : void 0
    }) : void 0;
  };

  lengthRanking = function(a, b) {
    var base, base1;
    return typeof (base = a.length < b.length) === "function" ? base({
      1: typeof (base1 = a.length > b.length) === "function" ? base1(-{
        1: 0
      }) : void 0
    }) : void 0;
  };

  module.exports = Regonizer = (function(superClass) {
    extend(Regonizer, superClass);

    function Regonizer() {
      this.imageArea = 0;
      this.rectDebugIndex = 0;
      this.debug = false;
      this.lowThresh = parseInt(variables.OCR_CANNY_THRESH_LOW);
      this.highThresh = parseInt(variables.OCR_CANNY_THRESH_HIGH);
      this.nIters = parseInt(variables.OCR_NITERS);
      this.relativeAreaMinimum = parseFloat(variables.OCR_RELATIVEAREAMINIMUM);
      this.relativeAreaMaximum = parseFloat(variables.OCR_RELATIVEAREAMAXIMUM);
      this.codeBlockRatio = parseFloat(variables.OCR_CODE_BLOCK_RATIO);
      this.maxDisplayWidth = 600;
      this.barcodes = [];
      this.barcodesHash = {};
      this.texts = [];
      this.addresses = [];
      this.boxes = [];
      this.extract = new Extract;
      this.db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
      this.db.setLimit(1);
      this.db.on('error', function(err) {
        throw err;
      });
    }

    Regonizer.prototype.setDebug = function(mode) {
      return this.debug = mode;
    };

    Regonizer.prototype.open = function(fileName) {
      var me;
      me = this;
      this.fileName = fileName;
      if (this.fileName) {
        return cv.readImage(this.fileName, function(err, im) {
          if (err) {
            return me.emit('error', err);
          } else {
            im.resize(im.width() * parseFloat(variables.OCR_IMAGE_WIDTH_SCALE), im.height() * parseFloat(variables.OCR_IMAGE_HEIGHT_SCALE));
            me.imageArea = im.width() * im.height();
            me.original = im.clone();
            im.convertGrayscale();
            me.image = im;
            return me.emit('open', true);
          }
        });
      } else {
        return me.emit('error', new Error('there is no image'));
      }
    };

    Regonizer.prototype.removeDoubleRect = function(sorts) {
      var i, lastrect, result;
      result = [];
      lastrect = "";
      i = sorts.length - 1;
      while (i > -1) {
        if (JSON.stringify(sorts[i].rect, null, 0) === lastrect) {

        } else {
          result.push(sorts[i]);
        }
        lastrect = JSON.stringify(sorts[i].rect, null, 0);
        i--;
      }
      return result.reverse();
    };

    Regonizer.prototype.drawRect = function(item) {
      var color, i, rect;
      i = this.rectDebugIndex % colorList.length;
      color = colorList[i];
      rect = item.rect;
      this.original.rectangle([rect.x, rect.y], [rect.width, rect.height], color, 15);
      return this.rectDebugIndex++;
    };

    Regonizer.prototype.show = function(im) {
      var scale, showImage, win;
      win = new cv.NamedWindow("Debug", 0);
      showImage = this.original.clone();
      if (typeof im !== 'undefined') {
        showImage = im.clone();
      }
      scale = 2;
      while (showImage.width() > this.maxDisplayWidth) {
        showImage.resize(showImage.width() / scale, showImage.height() / scale);
      }
      win.show(showImage);
      return win.blockingWaitKey(0);
    };

    Regonizer.prototype.appendBarcodes = function(item) {
      var code;
      code = item.code;
      if (item.type === 'I2/5') {
        code = item.code.substring(0, item.code.length - 1);
      }
      if (typeof this.barcodesHash[code] === 'undefined') {
        this.barcodesHash[code] = item.type;
        return this.barcodes.push(item.code.substring(0, item.code.length - 1));
      }
    };

    Regonizer.prototype.getBarcode = function(item) {
      var codes, cropped, imagecodes, j, len, r, results;
      r = item.rect;
      cropped = this.image.crop(r.x, r.y, r.width, r.height);
      xocr.SetMatrix(cropped);
      imagecodes = xocr.GetBarcode();
      results = [];
      for (j = 0, len = imagecodes.length; j < len; j++) {
        codes = imagecodes[j];
        results.push(this.appendBarcodes(codes));
      }
      return results;
    };

    Regonizer.prototype.contours = function(im_canny) {
      var contours, data, i, rect, relativeArea, sorts;
      im_canny.canny(this.lowThresh, this.highThresh);
      im_canny.dilate(this.nIters);
      if (this.debug) {
        this.show(im_canny);
      }
      im_canny.canny(this.lowThresh, this.highThresh);
      contours = im_canny.findContours();
      sorts = [];
      i = 0;
      while (i < contours.size()) {
        rect = contours.boundingRect(i);
        relativeArea = rect.width * rect.height / this.imageArea;
        if (relativeArea > this.relativeAreaMinimum && relativeArea < this.relativeAreaMaximum) {
          data = {
            index: i,
            rect: rect,
            area: rect.width * rect.height,
            relativeArea: relativeArea,
            ratio: Math.min(rect.width, rect.height) / Math.max(rect.width, rect.height),
            abs: Math.abs(Math.min(rect.width, rect.height) / Math.max(rect.width, rect.height) - this.codeBlockRatio)
          };
          sorts.push(data);
        }
        i++;
      }
      return sorts.sort(contourRanking);
    };

    Regonizer.prototype.barcode = function(sep) {
      var im_canny, item, j, k, len, len1, sorts;
      if (typeof this.image === 'undefined') {
        this.emit('error', new Error('the image is not loaded'));
      }
      im_canny = this.image.copy();
      im_canny.normalize(0, 255);
      sorts = this.contours(im_canny);
      sorts = this.removeDoubleRect(sorts);
      if (this.debug) {
        for (j = 0, len = sorts.length; j < len; j++) {
          item = sorts[j];
          this.drawRect(item);
        }
        this.show();
      }
      for (k = 0, len1 = sorts.length; k < len1; k++) {
        item = sorts[k];
        this.getBarcode(item);
      }
      return this.barcodes;
    };

    Regonizer.prototype.getAddress = function(item) {
      var adr;
      adr = this.extract.extractAddress(item);
      if (adr.state) {
        this.addresses.push(adr);
      }
      return adr;
    };

    Regonizer.prototype.getText = function(item) {
      var cropped, r, txt;
      r = item.rect;
      cropped = this.image.crop(r.x, r.y, r.width, r.height);
      xocr.SetMatrix(cropped);
      txt = xocr.GetText();
      return this.texts.push(txt);
    };

    Regonizer.prototype.text = function() {
      var im_canny, item, j, k, l, len, len1, len2, ref, sorts;
      if (typeof this.image === 'undefined') {
        this.emit('error', new Error('the image is not loaded'));
      }
      im_canny = this.image.copy();
      im_canny.normalize(0, 255);
      sorts = this.contours(im_canny);
      sorts = this.removeDoubleRect(sorts);
      if (this.debug) {
        for (j = 0, len = sorts.length; j < len; j++) {
          item = sorts[j];
          this.drawRect(item);
        }
        this.show();
      }
      for (k = 0, len1 = sorts.length; k < len1; k++) {
        item = sorts[k];
        this.getText(item);
      }
      ref = this.texts;
      for (l = 0, len2 = ref.length; l < len2; l++) {
        item = ref[l];
        this.getAddress(item);
      }
      return this.addresses;
    };

    Regonizer.prototype.checkFindSortboxCounter = function() {
      var me;
      me = this;
      me.findSortboxCounter--;
      if (me.findSortboxCounter === 0) {
        return me.emit('boxes', me.boxes, me.barcodes);
      }
    };

    Regonizer.prototype.findSortbox = function(item) {
      var housenumber, me, searchtext;
      me = this;
      searchtext = item.street + ', ' + item.zipCode + ' ' + item.town;
      housenumber = item.housenumber;
      this.db.once('sortbox', function(res) {
        var info;
        info = {
          box: res,
          item: item
        };
        me.boxes.push(info);
        return me.checkFindSortboxCounter();
      });
      this.db.once('ocrhash', function(res) {
        if (res.length > 0) {
          return me.db.findSortbox(res[0].ids, housenumber);
        } else {
          return me.checkFindSortboxCounter();
        }
      });
      return this.db.findText(searchtext);
    };

    Regonizer.prototype.sortbox = function() {
      var item, j, len, ref, results;
      this.text();
      this.findSortboxCounter = this.addresses.length + 1;
      this.checkFindSortboxCounter();
      ref = this.addresses;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        item = ref[j];
        results.push(this.findSortbox(item));
      }
      return results;
    };

    return Regonizer;

  })(EventEmitter);

}).call(this);
