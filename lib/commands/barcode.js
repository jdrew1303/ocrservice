(function() {
  var Barcode, Command, Recognizer, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('./command');

  variables = require('../variables');

  Recognizer = require('../classes/recognizer');

  module.exports = Barcode = (function(superClass) {
    extend(Barcode, superClass);

    function Barcode() {
      return Barcode.__super__.constructor.apply(this, arguments);
    }

    Barcode.commandName = 'barcode';

    Barcode.commandArgs = ['filename'];

    Barcode.options = [
      {
        parameter: "-d,--debug",
        description: "enable debug mode"
      }
    ];

    Barcode.commandShortDescription = 'extract the barcode from a given image file';

    Barcode.help = function() {
      return "";
    };

    Barcode.prototype.action = function(program, options) {
      var fn, recognizer;
      console.log('start', Math.round((process.memoryUsage()).rss / 1024));
      recognizer = new Recognizer;
      recognizer.setDebug(program.debug || false);
      recognizer.on('error', function(err) {
        throw err;
      });
      recognizer.on('open', function(res) {
        var fn;
        console.log('after open event', Math.round((process.memoryUsage()).rss / 1024));
        console.log(recognizer.barcode());
        recognizer.barcodeOriginal(function(codes) {
          return console.log(codes);
        });
        console.log('after barcode', Math.round((process.memoryUsage()).rss / 1024));
        recognizer.free();
        console.log('after free', Math.round((process.memoryUsage()).rss / 1024));
        fn = function() {
          console.log('end 10s', Math.round((process.memoryUsage()).rss / 1024));
          return console.log('done');
        };
        process.nextTick(fn);
        if (typeof global.gc === 'function') {
          return global.gc();
        }
      });
      fn = function() {
        console.log('before open', Math.round((process.memoryUsage()).rss / 1024));
        recognizer.open(options.filename);
        return console.log('after open', Math.round((process.memoryUsage()).rss / 1024));
      };
      console.log('before timer', Math.round((process.memoryUsage()).rss / 1024));
      process.nextTick(fn);
      if (typeof global.gc === 'function') {
        return global.gc();
      }
    };

    return Barcode;

  })(Command);

}).call(this);
