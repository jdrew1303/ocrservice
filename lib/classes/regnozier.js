(function() {
  var EventEmitter, Regonizer,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  module.exports = Regonizer = (function(superClass) {
    extend(Regonizer, superClass);

    function Regonizer() {}

    Regonizer.prototype.extractHousenumber = function(str) {
      var regexp;
      regexp = /([^\d]+)\s?(.+)/;
      return console.log(txt.match(regexp));
    };

    return Regonizer;

  })(EventEmitter);

}).call(this);
