(function() {
  var Command, child_process,
    slice = [].slice;

  child_process = require('child_process');

  module.exports = Command = (function() {
    function Command() {}

    Command.commandArgs = [];

    Command.options = [];

    Command.help = function() {
      return "    ";
    };

    Command.prototype.action = function(program, options) {
      return console.log(options);
    };

    Command.prototype.spawn = function() {
      var args, callback, child, cmd, errorChunks, options, outputChunks, remaining;
      cmd = arguments[0], args = arguments[1], remaining = 3 <= arguments.length ? slice.call(arguments, 2) : [];
      if (remaining.length >= 2) {
        options = remaining.shift();
      }
      callback = remaining.shift();
      child = child_process.spawn(command, args, options);
      errorChunks = [];
      outputChunks = [];
      child.stdout.on('data', function(chunk) {
        if (options != null ? options.streaming : void 0) {
          return process.stdout.write(chunk);
        } else {
          return outputChunks.push(chunk);
        }
      });
      child.stderr.on('data', function(chunk) {
        if (options != null ? options.streaming : void 0) {
          return process.stderr.write(chunk);
        } else {
          return errorChunks.push(chunk);
        }
      });
      child.on('error', function(error) {
        return callback(error, Buffer.concat(errorChunks).toString(), Buffer.concat(outputChunks).toString());
      });
      return child.on('close', function(code) {
        return callback(code, Buffer.concat(errorChunks).toString(), Buffer.concat(outputChunks).toString());
      });
    };

    return Command;

  })();

}).call(this);
