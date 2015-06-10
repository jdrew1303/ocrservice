(function() {
  var EventEmitter, Regonizer,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  module.exports = Regonizer = (function(superClass) {
    extend(Regonizer, superClass);

    function Regonizer() {
      this.lineseparator = "\n";
    }

    Regonizer.prototype.setLineSeparator = function(sep) {
      return this.lineseparator = sep;
    };

    Regonizer.prototype.extractHousenumber = function(str) {
      var matches, regexp, result, tmp;
      regexp = /([^\d]+)\s?(.+)/;
      matches = str.match(regexp);
      result = {
        street: str,
        housenumber: "1",
        housenumberExtension: "",
        flatNumber: ""
      };
      if (/(\d)/.test(matches[2])) {
        result.street = matches[1].trim();
        result.housenumber = matches[2].trim();
        if (result.housenumber.indexOf("/") > -1) {
          result.flatNumber = result.housenumber.substring(result.housenumber.indexOf("/") + 1);
          result.housenumber = result.housenumber.substring(0, result.housenumber.indexOf("/"));
          result.flatNumber = result.flatNumber.trim();
          result.housenumber = result.housenumber.trim();
        }
        if (!Number.isInteger(result.housenumber)) {
          tmp = result.housenumber;
          result.housenumber = parseInt(result.housenumber) + "";
          result.housenumberExtension = tmp.replace(result.housenumber, "");
          result.housenumberExtension = result.housenumberExtension.trim();
        }
      }
      return result;
    };

    Regonizer.prototype.extractAddress = function(str) {
      var extract, found, i, matches, nameLines, p, result, textLines;
      result = {
        name: "",
        street: "",
        housenumber: "",
        housenumberExtension: "",
        flatNumber: "",
        zipCode: "",
        town: "",
        state: false,
        message: "missing zip code"
      };
      matches = str.match(/\b\d{5}\b/g);
      textLines = str.split(this.lineseparator);
      if (matches != null) {
        result.zipCode = matches[matches.length - 1];
        i = textLines.length - 1;
        found = false;
        while (i > 0) {
          if (textLines[i].indexOf(result.zipCode) >= 0) {
            found = true;
            break;
          }
          i--;
        }
        result.message = "found zip code";
        if (found && i > 0) {
          result.town = textLines[i].replace(result.zipCode, '').trim();
          result.message = "found town";
          p = [];
          i--;
          while (i >= 0) {
            if (textLines[i].trim() !== '') {
              p = textLines[i].trim().split(' ');
              break;
            }
          }
          i--;
          nameLines = [];
          while (i >= 0) {
            if (textLines[i].trim() !== '') {
              nameLines.push(textLines[i].trim());
            }
            if (nameLines.length === 2) {
              break;
            }
            i--;
          }
          result.name = nameLines.reverse().join(' ');
          extract = this.extractHousenumber(p.join(' '));
          result.street = extract.street;
          result.housenumber = extract.housenumber;
          result.housenumberExtension = extract.housenumberExtension;
          result.flatNumber = extract.flatNumber;
          result.message = "all data extracted";
          result.state = true;
        }
      }
      return result;
    };

    return Regonizer;

  })(EventEmitter);

}).call(this);
