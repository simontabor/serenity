#!/usr/bin/env node

var cli = require('cli');
var fs = require('fs');

var Generator = require('./Generator.js');
var converter = require('./converter.js');

// where serenity has been executed from.
var root = process.cwd();
var config = require('../defaults.js');
var walkdir = require('walkdir');

var http = require('http');
var send = require('send');
var url = require('url');

var Serenity = module.exports = function(opts) {
  var self = this;
  self.opts = opts;
  self.config = self.getConfig();
  self.generator = new Generator(self.config);
};

Serenity.prototype.start = function() {
  var self = this;

  var opts = self.opts;

  if (opts.version) {
    return self.version();
  }

  if (opts.convert) {
    self.walk(new RegExp('.*\\.html$|.*_config\\.yml$'), new RegExp('.*/_site/.*'), function(err,list) {
      // list of all html files, not in _site
      if (err) cli.fatal('Error walking through files, please try again');
      if (list.length < 1) cli.fatal('Could not find any files to convert');
      converter.run(list);
    });
    return;
  }

  if (!opts.live_load) self.generate();

  if (!opts['no-server']) {
    self.startServer();
    if (opts.watch && !opts.live_load) self.watch();
  }
};

Serenity.prototype.version = function() {
  var v = require('../package.json').version;
  cli.info('serenity ' + v);
  return v;
};

Serenity.prototype.getConfig = function() {
  var self = this;

  var conf = {};
  var configPath = root + '/serenity.js';

  try {
    conf = require(configPath);
  }catch(e) {
    cli.info('Config error at ' + configPath);
    cli.error(e);
  }

  for (var i in conf) {
    if (!conf.hasOwnProperty(i)) continue;
    config[i] = conf[i]; // override defaults if specified
  }
  if (self.opts.asset_host) {
    config.asset_host = self.opts.asset_host;
  }

  var reg = '';
  for (var i = 0; i < (config.extensions || []).length;i++) {
    // build the extensions regex to see what files to generate
    reg+='.*\\.'+config.extensions[i]+(i<config.extensions.length-1 ? '$|' : '$');
  }
  // create the regex
  config.includeReg = new RegExp(reg);

  var ignore = config.ignore.map(function(i){ return (root + i).replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|\*]/g, '\\$&'); }).join('|');
  config.ignoreReg = new RegExp(ignore);

  return config;
};

Serenity.prototype.walk = function(include, ignore, cb) {
  var self = this;
  var files = [];
  var finder = walkdir(root);

  if (typeof include === 'function' && !ignore && !cb) {
    cb = include;
    include = config.includeReg;
    ignore = config.ignoreReg;
  }

  finder.on('file',function(file, stat) {
    if ((!include || include.test(file)) && (!ignore || !ignore.test(file))) {
      files.push(file);
    }
  });

  finder.on('end',function() {
    cli.info('Finished reading directory ' + root + ', ' + files.length + ' files');
    cb(null, files);
  });
};

Serenity.prototype.startServer = function() {
  var self = this;

  var app = http.createServer(function(req, res){
    cli.debug(req.method + ' ' + req.url);

    self.serveFile(req, res);

  }).listen(self.opts.port);

  cli.ok('Server started on port '+self.opts.port);
};

Serenity.prototype.serveFile = function(req, res) {
  var self = this;

  var parsed = url.parse(req.url);
  var path = parsed.pathname;

  function error(err) {
    cli.debug('error serving '+req.url + ' ' +err.status);
    res.statusCode = err.status || 500;
    res.end(err.message);
  }

  function redirect() {
    var loc = path + '/' + (parsed.search || '');
    res.statusCode = 301;
    res.setHeader('Location', loc);
    res.end('Redirecting to ' + loc);
  }

  function doSend() {
    send(req, path, { root: root + '/_site' })
      .on('error', error)
      .on('directory', redirect)
      .pipe(res);
  }

  if (!self.opts.live_load) return doSend();

  var fullPath = root + path;
  if (path[path.length - 1] === '/') fullPath += 'index.html';

  fs.stat(fullPath, function(err, stat) {

    if (stat && stat.isDirectory()) {
      if (path[path.length -1] === '/') return error({ status: 403 });
      return redirect();
    }

    // let's *try* to generate the file on the fly
    var sourcePath = fullPath.replace(root, '.');

    if (fullPath.split('.').pop() === 'css') {
      try {
        // check if plain css file exists
        fs.existsSync(sourcePath);
      } catch(e) {
        // if not, try generating the less file instead
        sourcePath = sourcePath.replace('css/', 'less/').replace(/\.css$/, '.less');
      }
    } else {
      sourcePath = sourcePath.replace(/\.html$/, '.ejs');
    }

    var start = Date.now();
    self.generator.processFile(sourcePath, true, function(err) {
      if (err) return error({ status: 500 });
      cli.info('Generated ' + path + ' in ' + (Date.now() - start) + 'ms');
      doSend();
    });
  });
};

Serenity.prototype.generate = function(file) {
  var self = this;

  if (file) cli.info('File changed, regenerating. '+file);
  var start = Date.now();

  self.walk(function(err, files) {
    for (var i = 0; i < files.length; i++) {
      files[i] = files[i].replace(root, '.');
    }
    self.generator.run(files, function(err) {
      if (err) {
        cli.error('Error generating site', err)
      } else {
        cli.ok('Generated site in ' + (Date.now() - start) + 'ms');
      }

      if (self.opts['no-server']) process.exit(err ? 1 : 0);
    });

  });
};

Serenity.prototype.watch = function() {
  var self = this;
  var finder = walkdir(root);

  cli.info('Watching ' + root);

  var watchDir = function(dir) {
    fs.watch(dir, function(evt, file) {
      if (!file) return self.generate();
      var filePath = dir + '/' + file;
      if (file[0] === '.' || !config.includeReg.test(filePath) || config.ignoreReg.test(filePath)) return;
      self.generate(filePath);
    });
  };

  watchDir(root);

  finder.on('directory',function(dir, stat) {
    if (config.ignoreReg.test(dir) || dir[0] === '.') return;

    watchDir(dir);
  });
}
