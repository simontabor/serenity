#!/usr/bin/env node

var cli = require('cli'),
fs = require('fs'),
config,
regen = require('./regenerate.js'), // the file regeneration script
root = process.cwd(), // where templr has been executed from.
files; // array of files within the directory

cli.parse({
  port:  ['p', 'Listen on this port - overrides any config values', 'number', 4000]
});

cli.main(function (args,options) {
console.log('Templr watching: ' + root);
  try {
    config = require('./templr.json');
  }catch(e) {
    config = {
      ignore: ['templr.json','README.md']
    };
    cli.error('No config file found at ./templr.json');
  }
  var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var pending = list.length;
      if (!pending) return done(null, results);
      list.forEach(function(file) {
        file = dir + '/'+file;
        fs.stat(file, function(err, stat) {

          var path = file.split('/');

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
      regen(files,config);
    }
  };

  // lets start walking through our root!
  walk('.',function(err,list) {
    files = list;
    regen(files,config);
    for (var i = 0; i < list.length; i++) {
      fs.watchFile(list[i],{interval:100},fileChanged);
    }
  });
});

