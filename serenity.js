#!/usr/bin/env node

var cli = require('cli'),
fs = require('fs'),
Generator = require('./lib/generator.js'), // the file regeneration script

root = process.cwd(), // where serenity has been executed from.
convert = require('./lib/convert.js'),
config = require('./defaults.js'),
watchr = require('watchr'),
walkdir = require('walkdir'),
url = require('url');


cli.parse({
  'no-server': [false, 'Don\'t start a server and exit after generation', 'boolean', false],
  port:  ['p', 'Listen on this port - overrides any config values', 'number', 4000],
  convert: ['c', 'Convert Jekyll (YAML with Liquid) site to Serenity (JSON with EJS)'],
  version: ['v','Shows the current Serenity version'],
  asset_host: ['a', 'Define an asset host (such as a CDN) for all compiled assets', 'string', '']
});


var walk = function(dir,include,ignore,done) {
  var files = [];
  var finder = walkdir(root);

  finder.on('file',function(file,stat) {
    if ((!include || include.test(file)) && (!ignore || !ignore.test(file))) {
      files.push(file);
    }
  });
  finder.on('end',function() {
    cli.info('Finished reading directory '+dir);
    done(null,files);
  });
};

var version = function() {
  cli.info('serenity '+require('./package.json').version);
};

cli.main(function (args,options) {

  if (options.version) {
    return version();
  }

  if (options.convert) {
    walk(root, new RegExp('.*\\.html$|.*_config\\.yml$'), new RegExp('.*/_site/.*'),function(err,list) {
      // list of all html files, not in _site
      if (err) cli.fatal('Error walking through files, please try again');
      if (list.length < 1) cli.fatal('Could not find any files to convert');
      convert.run(list);
    });
    return; // we dont want to boot up
  }

  if (!options['no-server']) {
    var http = require('http');
    var send = require('send');
    var url = require('url');

    var app = http.createServer(function(req, res){
      cli.debug(req.method + ' ' + req.url);
      function error(err) {
        cli.debug('error serving '+req.url + ' ' +err.status);
        res.statusCode = err.status || 500;
        res.end(err.message);
      }

      function redirect() {
        var u = url.parse(req.url);
        var loc = u.pathname + '/' + (u.search || '');
        res.statusCode = 301;
        res.setHeader('Location', loc);
        res.end('Redirecting to ' + loc);
      }

      send(req, url.parse(req.url).pathname)
      .root(root+'/_site')
      .on('error', error)
      .on('directory', redirect)
      .pipe(res);
    }).listen(options.port);
    cli.ok('Server started on port '+options.port);
  }

  // sort out config
  var usrconfig = {};
  try {
    usrconfig = require(root+'/serenity.js');
  }catch(e) {
    cli.info('Config error at '+root+'/serenity.js');
    cli.error(e);
  }

  for (var i in usrconfig) {
    if (!usrconfig.hasOwnProperty(i)) continue;
    config[i] = usrconfig[i]; // override defaults if specified
  }
  if (options.asset_host) {
    config.asset_host = options.asset_host;
  }

  var reg = '';
  for (var i = 0; i < (config.extensions || []).length;i++) {
    // build the extensions regex to see what files to generate
    reg+='.*\\.'+config.extensions[i]+(i<config.extensions.length-1 ? '$|' : '$');
  }
  // create the regex
  reg = new RegExp(reg);

  var ignore = config.ignore.map(function(i){ return root + i; }).join('|');
  ignore = new RegExp(ignore);

  config.watchr.next = function(err,watchers) {
    cli.ok('Serenity watching: ' + root);
  };

  var generator;

  config.watchr.listeners = {
    change: function(changeType,file,fileStat,oldStat) {

      if (generator) generator.cancel();

      cli.info('File changed, regenerating. '+file);
      var start = Date.now();

      walk(root,reg,ignore,function(err,files) {
        for (var i = 0; i < files.length; i++) {
          files[i] = files[i].replace(root,'.');
        }
        if (generator) generator.cancel();
        generator = new Generator(files, config, function(err) {
          if (err === 'cancelled') {
            cli.info('Cancelled regeneration');
          } else {
            cli.ok('Generated site in ' + (Date.now() - start) + 'ms');
          }
        });

      });
    }
  };
  cli.info('Just booted. Regenerating.');
  var start = Date.now();

  walk(root,reg,ignore,function(err,files) {
    for (var i = 0; i < files.length; i++) {
      files[i] = files[i].replace(root,'.');
    }
    generator = new Generator(files, config, function() {
      cli.ok('Generated site in ' + (Date.now() - start) + 'ms');
      if (!options['no-server']) return;

      cli.info('Exiting');
      process.exit();
    });
  });
  watchr.watch(config.watchr);


});
