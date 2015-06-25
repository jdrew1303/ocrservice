(function() {
  var EventEmitter, Extract,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  module.exports = Extract = (function(superClass) {
    extend(Extract, superClass);

    function Extract() {
      this.lineseparator = "\n";
    }

    Extract.prototype.setLineSeparator = function(sep) {
      return this.lineseparator = sep;
    };

    Extract.prototype.extractHousenumber = function(str) {
      var matches, regexp, result, tmp;
      regexp = /([^\d]+)\s?(.+)/;
      matches = str.match(regexp);
      result = {
        street: str,
        housenumber: "1",
        housenumberExtension: "",
        flatNumber: ""
      };
      if ((matches != null) && /(\d)/.test(matches[2])) {
        result.street = matches[1].trim();
        result.housenumber = matches[2].trim().replace(/\s/g, "");
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

    Extract.prototype.extractAddress = function(str, force) {
      var extract, found, i, matches, nameLines, p, result, textLines;
      if (typeof force === 'undefined') {
        force = false;
      }
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
          if (/[0-9]/.test(result.town) && !force === true) {
            result.message = "town contains none sense";
          } else {
            result.message = "found town";
            p = [];
            i--;
            while (i >= 0) {
              if (textLines[i].trim() !== '') {
                p = textLines[i].trim().split(' ');
                break;
              }
              i--;
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
            result.street = extract.street.replace(/\.$/, '').replace(/stn$/, 'str');
            if (result.street.length > 2) {
              result.housenumber = extract.housenumber;
              result.housenumberExtension = extract.housenumberExtension;
              result.flatNumber = extract.flatNumber;
              result.message = "all data extracted";
              result.state = true;
            } else {
              result.message = "street is to short";
            }
          }
        }
      }
      return result;
    };

    return Extract;

  })(EventEmitter);

}).call(this);
