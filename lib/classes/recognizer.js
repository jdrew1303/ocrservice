(function() {
  var DB, EventEmitter, Extract, OCR, Recognizer, child_process, colorList, contourRanking, cv, lengthRanking, spawn, variables, xocr,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  variables = require('../variables');

  cv = require('opencv');

  OCR = require('wocr').OCR;

  Extract = require('./extract');

  DB = require('../classes/db');

  child_process = require('child_process');

  spawn = child_process.spawn;

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

  module.exports = Recognizer = (function(superClass) {
    extend(Recognizer, superClass);

    function Recognizer(db, process_list) {
      var proc;
      this.showCounter = 0;
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
      if (typeof db !== 'undefined') {
        this.db = db;
      } else {
        this.db = new DB(variables.OCR_DB_NAME, variables.OCR_DB_USER, variables.OCR_DB_PASSWORD, variables.OCR_DB_HOST);
        this.db.setLimit(100);
        this.db.on('error', function(err) {
          throw err;
        });
      }
      if (typeof process_list === 'undefined') {
        console.log('CWatcherClient', 'there was no processlist given !');
      }
      if (typeof process_list === 'undefined') {
        this.process_list = [];
        proc = {
          method: 'getText_M2',
          OCR_CROPPED_TEXT_THRESHOLD_MIN: 10,
          OCR_CROPPED_TEXT_THRESHOLD_MAX: 50,
          OCR_TEXT_MIN_NORMALIZE: variables.OCR_TEXT_MIN_NORMALIZE,
          OCR_TEXT_MAX_NORMALIZE: 255,
          OCR_TEXT_CANNY_THRESH_LOW: variables.OCR_TEXT_CANNY_THRESH_LOW,
          OCR_TEXT_CANNY_THRESH_HIGH: variables.OCR_TEXT_CANNY_THRESH_HIGH,
          OCR_TEXT_NITERS: variables.OCR_TEXT_NITERS
        };
        this.process_list.push(proc);
        proc = {
          method: 'getText_M2',
          OCR_CROPPED_TEXT_THRESHOLD_MIN: 60,
          OCR_CROPPED_TEXT_THRESHOLD_MAX: 90,
          OCR_TEXT_MIN_NORMALIZE: variables.OCR_TEXT_MIN_NORMALIZE,
          OCR_TEXT_MAX_NORMALIZE: 255,
          OCR_TEXT_CANNY_THRESH_LOW: variables.OCR_TEXT_CANNY_THRESH_LOW,
          OCR_TEXT_CANNY_THRESH_HIGH: variables.OCR_TEXT_CANNY_THRESH_HIGH,
          OCR_TEXT_NITERS: variables.OCR_TEXT_NITERS
        };
        this.process_list.push(proc);
      } else {
        this.process_list = process_list;
      }
    }

    Recognizer.prototype.setDebug = function(mode) {
      return this.debug = mode;
    };

    Recognizer.prototype.free = function() {
      this.original = null;
      this.barcode_image = null;
      return this.image = null;
    };

    Recognizer.prototype.open = function(fileName, brightness) {
      var me;
      debug('open', fileName + ' #' + brightness);
      me = this;
      this.brightness = false;
      if (typeof brightness === 'undefined') {
        this.brightness = true;
      }
      this.fileName = fileName;
      if (this.fileName) {
        return cv.readImage(this.fileName, this.imageReaded.bind(this));
      } else {
        return me.emit('error', new Error('there is no image'));
      }
    };

    Recognizer.prototype.test = function() {
      var im;
      im = this.original.clone();
      return this.processList();
    };

    Recognizer.prototype.imageReaded = function(err, im) {
      var me;
      me = this;
      if (err) {
        return me.emit('error', err);
      } else {
        this.im = im;
        return this.imageReadedNextTick();
      }
    };

    Recognizer.prototype.imageReadedNextTick = function() {
      var im, me;
      me = this;
      im = this.im;
      if (im.width() === 0) {
        return me.emit('error', 'zero size');
      } else {
        im.shearing(1, 0, 0, 0.06, 1, 0);
        im.resize(im.width() * parseFloat(variables.OCR_IMAGE_WIDTH_SCALE), im.height() * parseFloat(variables.OCR_IMAGE_HEIGHT_SCALE));
        me.imageArea = im.width() * im.height();
        me.original = im.clone();
        me.barcode_image = im.clone();
        me.barcode_image.convertGrayscale();
        me.image = im.clone();
        if (this.brightness === true) {
          debug('brightness', '');
          me.image.brightness(parseFloat(variables.OCR_IMAGE_CONTRAST), parseInt(variables.OCR_IMAGE_BIGHTNESS));
        }
        me.image.convertGrayscale();
        im = null;
        return me.emit('open', true);
      }
    };

    Recognizer.prototype.removeDoubleRect = function(sorts) {
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

    Recognizer.prototype.drawRect = function(item) {
      var color, i, rect;
      i = this.rectDebugIndex % colorList.length;
      color = colorList[i];
      rect = item.rect;
      this.contourImage.rectangle([rect.x, rect.y], [rect.width, rect.height], color, 15);
      return this.rectDebugIndex++;
    };

    Recognizer.prototype.show = function(im) {
      var scale, showImage, win;
      if (parseInt(variables.OCR_DEBUG_WINDOW) === 1) {
        win = new cv.NamedWindow("Debug" + (this.showCounter++), 0);
        showImage = im.clone();
        scale = 2;
        while (showImage.width() > this.maxDisplayWidth) {
          showImage.resize(showImage.width() / scale, showImage.height() / scale);
        }
        win.show(showImage);
        return win.blockingWaitKey(parseInt(variables.OCR_DEBUG_WINDOW_TIMEOUT));
      }
    };

    Recognizer.prototype.outerbounding = function() {
      var area, bound_image, contours, i, last_area, rect, rect_area, result;
      bound_image = this.image.clone();
      result = {
        x: 0,
        y: 0,
        width: bound_image.width(),
        height: bound_image.height()
      };
      area = result.width * result.height;
      last_area = 0;
      bound_image.canny(0, 100);
      if (this.debug) {
        this.show(bound_image);
      }
      bound_image.findContours();
      i = 0;
      contours = bound_image.findContours();
      while (i < contours.size()) {
        rect = contours.boundingRect(i);
        rect_area = rect.width * rect.height;
        if (rect_area / area > 0.2) {
          if (rect_area > last_area) {
            result = rect;
            last_area = rect_area;
          }
        }
        i++;
      }
      return result;
    };

    Recognizer.prototype.appendBarcodes = function(item) {
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

    Recognizer.prototype.getBarcode = function(item) {
      var codes, cropped, imagecodes, j, len, r;
      r = item.rect;
      cropped = this.image.crop(r.x, r.y, r.width, r.height);
      xocr.SetMatrix(cropped);
      if (this.debug) {
        this.show(cropped);
      }
      imagecodes = xocr.GetBarcode();
      for (j = 0, len = imagecodes.length; j < len; j++) {
        codes = imagecodes[j];
        this.appendBarcodes(codes);
      }
      return xocr.free();
    };

    Recognizer.prototype.contours = function(im_canny, lowThresh, highThresh, nIters) {
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

    Recognizer.prototype.barcodeOriginal = function(cb) {
      var child, codes, me;
      me = this;
      codes = [];
      console.log(this.fileName);
      child = spawn('zbarimg', [this.fileName]);
      child.stdout.on('data', function(data) {
        var codeparts;
        codeparts = data.toString().replace(/\n/, '').split(':');
        if (codeparts.length === 2) {
          return codes.push(codeparts[1]);
        }
      });
      child.stderr.on('data', function(data) {
        return console.log(data.toString());
      });
      return child.on('exit', function(code) {
        me.barcodes = codes;
        return cb(codes);
      });
    };

    Recognizer.prototype.barcode = function(sep) {
      var codes, im_canny, imagecodes, item, j, k, len, len1, sorts;
      if (typeof this.barcode_image === 'undefined') {
        this.emit('error', new Error('the image is not loaded'));
      }
      im_canny = this.barcode_image.copy();
      im_canny.normalize(parseInt(variables.OCR_BC_MIN_NORMALIZE), 255);
      this.contourImage = this.original.clone();
      sorts = this.contours(im_canny, parseInt(variables.OCR_BC_CANNY_THRESH_LOW), parseInt(variables.OCR_BC_CANNY_THRESH_HIGH), parseInt(variables.OCR_BC_NITERS));
      sorts = this.removeDoubleRect(sorts);
      for (j = 0, len = sorts.length; j < len; j++) {
        item = sorts[j];
        this.getBarcode(item);
      }
      if (this.barcodes.length === 0) {
        xocr.SetMatrix(this.barcode_image);
        imagecodes = xocr.GetBarcode();
        console.log('imagecodes', imagecodes);
        for (k = 0, len1 = imagecodes.length; k < len1; k++) {
          codes = imagecodes[k];
          this.appendBarcodes(codes);
        }
        xocr.free();
      }
      this.barcodes.sort(lengthRanking);
      return this.barcodes;
    };

    Recognizer.prototype.getAddress = function(item, force) {
      var adr;
      adr = this.extract.extractAddress(item, force);
      if (adr.state) {
        this.addresses.push(adr);
      }
      return adr;
    };

    Recognizer.prototype.getText_M1 = function(item, config) {
      var cropped, r, txt;
      if (typeof config === 'undefined') {
        config = this.process_list[0];
      }
      r = item.rect;
      cropped = this.image.crop(r.x, r.y, r.width, r.height);
      cropped.normalize(parseInt(config.OCR_CROPPED_TEXT_MIN_NORMALIZE), parseInt(config.OCR_CROPPED_TEXT_MAX_NORMALIZE));
      cropped.brightness(parseFloat(config.OCR_CROPPED_TEXT_CONTRAST), parseInt(config.OCR_CROPPED_TEXT_BIGHTNESS));
      if (this.debug) {
        this.show(cropped);
      }
      xocr.SetMatrix(cropped);
      if (this.debug) {
        this.show(cropped);
      }
      txt = xocr.GetText();
      xocr.free();
      cropped = null;
      return this.texts.push(txt);
    };

    Recognizer.prototype.getText = function(item, config) {
      var cropped, r, txt;
      if (typeof config === 'undefined') {
        config = this.process_list[0];
      }
      r = item.rect;
      cropped = this.image.crop(r.x, r.y, r.width, r.height);
      cropped = cropped.threshold(parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MIN), parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MAX));
      cropped.equalizeHist();
      if (this.debug) {
        this.show(cropped);
      }
      xocr.SetMatrix(cropped);
      if (this.debug) {
        this.show(cropped);
      }
      txt = xocr.GetText();
      xocr.free();
      cropped = null;
      return this.texts.push(txt);
    };

    Recognizer.prototype.getText_M2 = function(item, config) {
      var cropped, mean, r, stddev, txt;
      if (typeof config === 'undefined') {
        config = this.process_list[0];
      }
      r = item.rect;
      cropped = this.image.crop(r.x, r.y, r.width, r.height);
      cropped = cropped.threshold(parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MIN), parseInt(config.OCR_CROPPED_TEXT_THRESHOLD_MAX));
      cropped.equalizeHist();
      mean = cropped.meanStdDev().mean.pixel(0, 0);
      stddev = cropped.meanStdDev().stddev.pixel(0, 0);
      if (mean === 0 && stddev === 0) {
        info('getText_M2', 'skipped mean and stddev = 0');
        return;
      }
      if (this.debug) {
        this.show(cropped);
      }
      cropped.rotate(config.OCR_CROPPED_ROTATION || 0);
      xocr.SetMatrix(cropped);
      if (this.debug) {
        this.show(cropped);
      }
      txt = xocr.GetText();
      xocr.free();
      if (false) {
        cropped.rotate(-90);
        xocr.SetMatrix(cropped);
        if (this.debug) {
          this.show(cropped);
        }
        txt = xocr.GetText();
        xocr.free();
        cropped.rotate(-90);
        xocr.SetMatrix(cropped);
        if (this.debug) {
          this.show(cropped);
        }
        txt = xocr.GetText();
        xocr.free();
        cropped.rotate(-90);
        xocr.SetMatrix(cropped);
        if (this.debug) {
          this.show(cropped);
        }
        txt = xocr.GetText();
        xocr.free();
      }
      cropped = null;
      return this.texts.push(txt);
    };

    Recognizer.prototype.text = function() {
      var im_canny, item, j, k, l, len, len1, len2, len3, len4, m, n, ref, sorts;
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
      if (parseInt(variables.OCR_TEXT_METHOD) === 0) {
        for (k = 0, len1 = sorts.length; k < len1; k++) {
          item = sorts[k];
          this.getText_M1(item, variables);
        }
      }
      if (parseInt(variables.OCR_TEXT_METHOD) === 1) {
        for (l = 0, len2 = sorts.length; l < len2; l++) {
          item = sorts[l];
          this.getText(item, variables);
        }
      }
      if (parseInt(variables.OCR_TEXT_METHOD) === 2) {
        for (m = 0, len3 = sorts.length; m < len3; m++) {
          item = sorts[m];
          this.getText_M2(item, variables);
        }
      }
      ref = this.texts;
      for (n = 0, len4 = ref.length; n < len4; n++) {
        item = ref[n];
        this.getAddress(item);
      }
      return this.addresses;
    };

    Recognizer.prototype.textMethod = function(methodConfig) {
      var im_canny, item, j, k, l, len, len1, len2, ref, sorts;
      if (typeof this.image === 'undefined') {
        this.emit('error', new Error('the image is not loaded'));
      }
      im_canny = this.image.copy();
      if (typeof methodConfig.OCR_TEXT_MIN_NORMALIZE === 'number') {
        if (typeof methodConfig.OCR_TEXT_MAX_NORMALIZE === 'number') {
          im_canny.normalize(parseInt(methodConfig.OCR_TEXT_MIN_NORMALIZE), parseInt(methodConfig.OCR_TEXT_MAX_NORMALIZE));
        }
      }
      this.contourImage = this.original.clone();
      sorts = this.contours(im_canny, parseInt(methodConfig.OCR_TEXT_CANNY_THRESH_LOW), parseInt(methodConfig.OCR_TEXT_CANNY_THRESH_HIGH), parseInt(methodConfig.OCR_TEXT_NITERS));
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
        this[methodConfig.method](item, methodConfig);
      }
      ref = this.texts;
      for (l = 0, len2 = ref.length; l < len2; l++) {
        item = ref[l];
        this.getAddress(item);
      }
      return this.addresses;
    };

    Recognizer.prototype.processList = function(index) {
      var fn;
      if (typeof index === 'undefined') {
        index = -1;
      }
      if (index === -1) {
        this.barcode();
        if (this.barcodes.length === 0) {
          fn = function(codes) {
            this.barcodes = codes;
            return this.processList(index + 1);
          };
          return this.barcodeOriginal(fn.bind(this));
        } else {
          return this.processList(index + 1);
        }
      } else if (index >= this.process_list.length) {
        return this.emit('boxes', [], this.barcodes);
      } else {
        console.log('processList', index, this.process_list.length, this.process_list[index]);
        this.textMethod(this.process_list[index]);
        this.once('internalboxes', function(res, codes) {
          if (typeof res !== 'undefined' && res.length > 0 && typeof res[0].box !== 'undefined' && res[0].box.length === 1) {
            return this.emit('boxes', res, codes);
          } else {
            return this.processList(index + 1);
          }
        });
        return this.sortboxAfterText();
      }
    };

    Recognizer.prototype.reduceResult = function() {
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

    Recognizer.prototype.fixResult = function(res, codes) {
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

    Recognizer.prototype.checkFindSortboxCounter = function() {
      var me;
      me = this;
      me.findSortboxCounter--;
      if (me.findSortboxCounter === 0) {
        return me.emit('internalboxes', me.fixResult(me.reduceResult(), me.barcodes), me.barcodes);
      }
    };

    Recognizer.prototype.findSortbox = function(item) {
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

    Recognizer.prototype.sortbox = function() {
      return this.processList();
    };

    Recognizer.prototype.sortboxAfterText = function() {
      var item, j, len, ref, results;
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

    return Recognizer;

  })(EventEmitter);

}).call(this);
