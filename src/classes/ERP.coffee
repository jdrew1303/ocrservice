request = require 'request'
{EventEmitter} = require 'events'


module.exports =
class ERP extends EventEmitter
  constructor: (options)->
    @options = options
    @sid = ''
  login: () ->
    if @sid!=''
      @logout()
    opt =
      url: @options.url
      formData:
        TEMPLATE: 'NO'
        return: 'json'
        mandant: @options.client,
        username: @options.login,
        password: @options.password
    request.post opt, (err, httpResponse, body) => @onLoginResponse(err, httpResponse, body)
  onLoginResponse: (err, httpResponse, body) ->
    if err
      @emit 'loginError', err
    else
      json = JSON.parse body
      if json.success==true
        @sid = json.sid
        @emit 'loginSuccess', json.sid
      else
        @emit 'loginError', body
  logout: () ->
    request.get @options.url+'?TEMPLATE=NO&sid='+@sid+'&cmp=cmp_logout'
    @sid = ''
    @emit 'logged out'

  getFastAccessTour: () ->

  put: (sending,item) ->
    if @sid!=''
      today= new Date
      data = []
      data.push({name: "Barcode",wert: sending.id})
      data.push({name: "Strasse",wert: item.street})
      data.push({name: "HN",wert: item.houseNumber})
      data.push({name: "PLZ",wert: item.zipCode})
      data.push({name: "Ort",wert: item.town})
      data.push({name: "Name",wert: item.name})
      options =
        url: @options.url
        formData:
          sid: @sid,
          TEMPLATE: 'NO',
          cmp: 'cmp_sv_web_erfassung',
          page: "ajax/save",
          limit: 100000,
          start: 0,
          regiogruppe: 'Zustellung',
          modell: 'Standardbriefsendungen',
          sortiergang: sending.sg,
          data: JSON.stringify( data,null,0 )
      request.post  options, (err, httpResponse, body) => @onPutResponse(err, httpResponse, body)
    else
      @emit 'error', 'no logged in'

  onPutResponse: (err, httpResponse, body) ->
    if err
      @emit 'error', err
    else
      try
        json = JSON.parse body
        if json.success==true
          @emit 'put', json.results
        else
          @emit 'error', body
      catch e
        @emit 'error', e
