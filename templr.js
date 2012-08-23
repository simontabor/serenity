#!/usr/bin/env node

var cli = require('cli'),
fs = require('fs'),
config,
childProcess = require('child_process'),
exec = childProcess.exec,
regen = require('./regenerate.js'),
files;


cli.main(function (args,options) {
  // ensure no trailing slash
  if (args[0].charAt(args[0].length-1) == "/") args[0] = args[0].substr(0,args[0].length-1);
 try {
  config = require(args[0]+'/config.json');
}catch(e) {
  cli.error('No config file found at '+args[0]);
}
var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = dir +'/'+ file;
      fs.stat(file, function(err, stat) {
        var path = file.split('/');
        console.log(path,path[path.length-1]);
        if (path[path.length-1] == '_site') {
          if (!--pending) done(null, results);
        }else{
          if (stat && stat.isDirectory()) {
            walk(file, function(err, res) {
              results = results.concat(res);
              if (!--pending) done(null, results);
            });
          } else {
            results.push(file);
            if (!--pending) done(null, results);
          }
        }
      });
    });
  });
};
var fileChanged = function (curr, prev) {
  if (curr.mtime > prev.mtime) {
  cli.debug('File changed, regenerating.');
  regen(args[0],files,config);
}
};
walk(args[0],function(err,list) {
  files = list;
  for (var i = 0; i < list.length; i++) {
    fs.watchFile(list[i],{interval:100},fileChanged);
  }
});
});

