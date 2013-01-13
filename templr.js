#!/usr/bin/env node

var cli = require('cli'),
fs = require('fs'),
regen = require('./regenerate.js'), // the file regeneration script
root = process.cwd(), // where templr has been executed from.
convert = require('./convert.js'),
config = require('./defaults.js'),
server = require('node-static'),
watchr = require('watchr'),
findit = require('findit');

cli.parse({
  port:  ['p', 'Listen on this port - overrides any config values', 'number', 4000],
  server: ['s', 'Start up a server for the static files', 'boolean', true],
  convert: ['c', 'Convert Jekyll (YAML with Liquid) site to Templr (JSON with EJS)','boolean',false]
});


var walk = function(dir,include,ignore,done) {
  var files = [];
  var finder = findit.find(root);
  
  finder.on('file',function(file,stat) {
    if ((!include || include.test(file)) && (!ignore || !ignore.test(file))) files.push(file);
  });
  finder.on('end',function() {
    cli.info('Finished reading directory '+dir);
    done(null,files);
  });
};



cli.main(function (args,options) {

  if (options.convert) {
    walk(root, new RegExp('.*\\.html$'), new RegExp('.*/_site/.*'),function(err,list) {
      // list of all html files, not in _site
      if (err) cli.fatal('Error walking through files, please try again');
      if (list.length < 1) cli.fatal('Could not find any files to convert');
      convert.run(list);
    });
    return; // we dont want to boot up
  }


  if (options.server) {
    var file = new server.Server(root+'/_site', { cache: 1 });
    require('http').createServer(function (request, response) {
      cli.debug(request.method+': '+request.url);
      request.addListener('end', function () {
        file.serve(request, response).addListener('error', function(err) {
          cli.error('Error serving '+request.url+' - '+err.message);
        });
      });
    }).listen(options.port);
    cli.ok('Server started on port '+options.port);
  }

  // sort out config
  var usrconfig = {};
  try {
    usrconfig = require(root+'/templr.js');
  }catch(e) {
    cli.info('Config error at '+root+'/templr.js');
    cli.error(e);
  }

  for (var i in usrconfig) {
    if (!usrconfig.hasOwnProperty(i)) continue;
    config[i] = usrconfig[i]; // override defaults if specified
  }

  var reg = '';
  for (var i = 0; i < config.extensions.length;i++) {
    // build the extensions regex to see what files to generate
    reg+='.*\\.'+config.extensions[i]+(i<config.extensions.length-1 ? '$|' : '$');
  }
  // create the regex
  reg = new RegExp(reg);

  config.watchr.next = function(err,watchers) {
    cli.ok('Templr watching: ' + root);
  };
  config.watchr.listeners = {
    change: function(changeType,file,fileStat,oldStat) {
      cli.info('File changed, regenerating. '+file);
      walk(root,reg,null,function(err,files) {
        for (var i = 0; i < files.length; i++) {
          files[i] = files[i].replace(root,'.');
        }
        regen(files,config);
      });
    }
  };
  watchr.watch(config.watchr);


});