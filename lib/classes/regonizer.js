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
    if (a.abs > b.abs) {
      return 1;
    } else if (a.abs < b.abs) {
      return -1;
    } else {
      return 0;
    }
  };

  lengthRanking = function(a, b) {
    if (a.length < b.length) {
      return 1;
    } else if (a.length > b.length) {
      return -1;
    } else {
      return 0;
    }
  };

  module.exports = Regonizer = (function(superClass) {
    extend(Regonizer, superClass);

    function Regonizer() {
      this.imageArea = 0;
      this.rectDebugIndex = 0;
      this.debug = false;
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
      this.db.setLimit(100);
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
            me.barcode_image = im.clone();
            me.barcode_image.convertGrayscale();
            me.image = im.clone();
            me.image.brightness(parseFloat(variables.OCR_IMAGE_CONTRAST), parseInt(variables.OCR_IMAGE_BIGHTNESS));
            me.image.convertGrayscale();
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
      this.contourImage.rectangle([rect.x, rect.y], [rect.width, rect.height], color, 15);
      return this.rectDebugIndex++;
    };

    Regonizer.prototype.show = function(im) {
      var scale, showImage, win;
      if (parseInt(variables.OCR_DEBUG_WINDOW) === 1) {
        win = new cv.NamedWindow("Debug", 0);
        showImage = im.clone();
        scale = 2;
        while (showImage.width() > this.maxDisplayWidth) {
          showImage.resize(showImage.width() / scale, showImage.height() / scale);
        }
        win.show(showImage);
        return win.blockingWaitKey(parseInt(variables.OCR_DEBUG_WINDOW_TIMEOUT));
      }
    };

    Regonizer.prototype.appendBarcodes = function(item) {
      var code;
      code = item.code;
      if (code.indexOf('http://') === -1) {
        if (item.type === 'I2/5') {
          code = item.code.substring(0, item.code.length - 1);
        }
        if (typeof this.barcodesHash[code] === 'undefined') {
          this.barcodesHash[code] = item.type;
          return this.barcodes.push(item.code.substring(0, item.code.length - 1));
        }
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

    Regonizer.prototype.contours = function(im_canny, lowThresh, highThresh, nIters) {
      var contours, data, i, rect, relativeArea, sorts;
      im_canny.canny(lowThresh, highThresh);
      if (this.debug) {
        this.show(im_canny);
      }
      im_canny.dilate(nIters);
      if (this.debug) {
        this.show(im_canny);
      }
      im_canny.canny(lowThresh, highThresh);
      if (this.debug) {
        this.show(im_canny);
      }
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
      var codes, im_canny, imagecodes, item, j, k, l, len, len1, len2, sorts;
      if (typeof this.barcode_image === 'undefined') {
        this.emit('error', new Error('the image is not loaded'));
      }
      im_canny = this.barcode_image.copy();
      im_canny.normalize(parseInt(variables.OCR_BC_MIN_NORMALIZE), 255);
      this.contourImage = this.original.clone();
      sorts = this.contours(im_canny, parseInt(variables.OCR_BC_CANNY_THRESH_LOW), parseInt(variables.OCR_BC_CANNY_THRESH_HIGH), parseInt(variables.OCR_BC_NITERS));
      sorts = this.removeDoubleRect(sorts);
      if (this.debug) {
        for (j = 0, len = sorts.length; j < len; j++) {
          item = sorts[j];
          this.drawRect(item);
        }
        this.show(this.contourImage);
      }
      for (k = 0, len1 = sorts.length; k < len1; k++) {
        item = sorts[k];
        this.getBarcode(item);
      }
      if (this.barcodes.length === 0) {
        xocr.SetMatrix(this.barcode_image);
        imagecodes = xocr.GetBarcode();
        for (l = 0, len2 = imagecodes.length; l < len2; l++) {
          codes = imagecodes[l];
          this.appendBarcodes(codes);
        }
      }
      this.barcodes.sort(lengthRanking);
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
      cropped.normalize(parseInt(variables.OCR_CROPPED_TEXT_MIN_NORMALIZE), parseInt(variables.OCR_CROPPED_TEXT_MAX_NORMALIZE));
      cropped.brightness(parseFloat(variables.OCR_CROPPED_TEXT_CONTRAST), parseInt(variables.OCR_CROPPED_TEXT_BIGHTNESS));
      if (this.debug) {
        this.show(cropped);
      }
      xocr.SetMatrix(cropped);
      if (this.debug) {
        this.show(cropped);
      }
      txt = xocr.GetText();
      return this.texts.push(txt);
    };

    Regonizer.prototype.text = function() {
      var im_canny, item, j, k, l, len, len1, len2, ref, sorts;
      if (typeof this.image === 'undefined') {
        this.emit('error', new Error('the image is not loaded'));
      }
      im_canny = this.image.copy();
      im_canny.normalize(parseInt(variables.OCR_TEXT_MIN_NORMALIZE), 255);
      this.contourImage = this.original.clone();
      sorts = this.contours(im_canny, parseInt(variables.OCR_TEXT_CANNY_THRESH_LOW), parseInt(variables.OCR_TEXT_CANNY_THRESH_HIGH), parseInt(variables.OCR_TEXT_NITERS));
      sorts = this.removeDoubleRect(sorts);
      if (this.debug) {
        for (j = 0, len = sorts.length; j < len; j++) {
          item = sorts[j];
          this.drawRect(item);
        }
        this.show(this.contourImage);
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

    Regonizer.prototype.reduceResult = function() {
      var address, c, j, len, me, ref, resHash, result;
      me = this;
      result = [];
      resHash = [];
      ref = me.addresses;
      for (j = 0, len = ref.length; j < len; j++) {
        address = ref[j];
        c = JSON.stringify(address.box, null, 0);
        if (resHash.indexOf(c) === -1) {
          result.push(address);
          resHash.push(c);
        }
      }
      return result;
    };

    Regonizer.prototype.fixResult = function(res, codes) {
      var item, j, len, result;
      result = [];
      for (j = 0, len = res.length; j < len; j++) {
        item = res[j];
        item.codes = codes;
        item.ocr_street = item.street;
        item.ocr_zipCode = item.zipCode;
        item.ocr_town = item.town;
        if (typeof item.box !== 'undefined' && item.box.length > 0) {
          item.street = item.box[0].strasse;
          item.zipCode = item.box[0].plz;
          item.town = item.box[0].ort;
          item.district = item.box[0].ortsteil;
        }
        result.push(item);
      }
      return result;
    };

    Regonizer.prototype.checkFindSortboxCounter = function() {
      var me;
      me = this;
      me.findSortboxCounter--;
      if (me.findSortboxCounter === 0) {
        return me.emit('boxes', me.fixResult(me.reduceResult(), me.barcodes), me.barcodes);
      }
    };

    Regonizer.prototype.findSortbox = function(item) {
      var housenumber, me, searchtext;
      me = this;
      searchtext = item.street + ', ' + item.zipCode + ' ' + item.town;
      housenumber = item.housenumber;
      this.db.once('sortbox', function(res) {
        item.box = res;
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
