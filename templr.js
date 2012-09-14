#!/usr/bin/env node

var cli = require('cli'),
fs = require('fs'),
regen = require('./regenerate.js'), // the file regeneration script
root = process.cwd(), // where templr has been executed from.
files, // array of files within the directory
config = require('./defaults.json'),
server = require('node-static');

cli.parse({
  port:  ['p', 'Listen on this port - overrides any config values', 'number', 4000],
  server: ['s', 'Start up a server for the static files', 'boolean', true]
});

cli.main(function (args,options) {
  cli.ok('Templr watching: ' + root);

  if (options.server) {
    var file = new server.Server('./_site', { cache: 1 });
    require('http').createServer(function (request, response) {
      cli.debug(request.method+': '+request.url);
      request.addListener('end', function () {
          file.serve(request, response);
      });
    }).listen(options.port);
  }

  // sort out config
  var usrconfig = {};
  try {
    usrconfig = require(root+'/templr.json');
  }catch(e) {
    cli.info('No config file found at '+root+'/templr.json');
  }

  for (var i in usrconfig) {
    config[i] = usrconfig[i]; // override defaults if specified
  }

  // this is the walk function, it goes through all files and directories
  var walk = function(dir, done) {
    cli.debug('Reading directory '+dir);
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var pending = list.length;
      if (!pending) return done(null, results);
      list.forEach(function(file) {
        file = dir + '/'+file;
        fs.stat(file, function(err, stat) {

          var path = file.split('/');

          var ignored = false;
          for (var i = 0; i< (config.ignore || []).length; i++) { // loop through config to search file dir
            if (~file.indexOf(config.ignore[i])) ignored = true;
          }
          if (path[path.length-1].substr(0,1) == '_' || ignored) {
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
      cli.info('File changed, regenerating.');
      regen(files,config);
    }
  };

  // lets start walking through our root!
  walk('.',function(err,list) {
    if (err) {
      cli.error('Error walking through files, please try again');
      return;
    }
    files = list;
    regen(files,config);
    for (var i = 0; i < list.length; i++) {
      // using watchFile because watch isn't supported everywhere, not ideal
      fs.watchFile(list[i],{interval:100},fileChanged);
    }
  });
});

