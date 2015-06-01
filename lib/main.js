var colors = require("colors");
global.logDebug = process.env.log_debug !== "0";
global.logInfo = process.env.log_info !== "0";
global.logWarn = process.env.log_warn !== "0";
global.logError = process.env.log_error !== "0";
global.log = function(type,tag,msg){
  switch(type){
    case 'debug':
      if (global.logDebug){
        console.log( colors.blue(type),colors.gray(tag),msg );
      }
    break;
    case 'info':
      if (global.logInfo){
        console.log( colors.green(type),colors.gray(tag),msg );
      }
    break;
    case 'warn':
      if (global.logWarn){
        console.log( colors.yellow(type),colors.gray(tag),msg );
      }
    break;
    case 'error':
      if (global.logError){
        console.log( colors.red(type),colors.gray(tag),msg );
      }
    break;
  }
}

var classNames = ['DBClient'];
for(var i=0;i<classNames.length;i++){
  exports[classNames[i]] = (require('./classes/'+classNames[i]))[classNames[i]];
}
