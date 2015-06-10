{EventEmitter} = require 'events'

module.exports =
class Regonizer extends EventEmitter
  constructor: ()->
  extractHousenumber: (str)->
    regexp = /([^\d]+)\s?(.+)/
    matches = str.match(regexp)
    result =
      street: str
      housenumber: "1"
      housenumberExtension: ""
      flatNumber: ""
    if /(\d)/.test(matches[2])
      result.street = matches[1].trim()
      result.housenumber = matches[2].trim()
      if result.housenumber.indexOf("/") > -1
        result.flatNumber = result.housenumber.substring result.housenumber.indexOf("/")+1
        result.housenumber = result.housenumber.substring 0, result.housenumber.indexOf("/")
        result.flatNumber = result.flatNumber.trim()
        result.housenumber = result.housenumber.trim()
      if !Number.isInteger(result.housenumber)
        tmp = result.housenumber
        result.housenumber = parseInt(result.housenumber)+""
        result.housenumberExtension = tmp.replace result.housenumber,""
        result.housenumberExtension = result.housenumberExtension.trim()
    result
