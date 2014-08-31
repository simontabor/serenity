var fs = require('fs-extra');
var async = require('async');
var cluster = require('cluster');
var cli = require('cli');

var root = process.cwd();
var _site = root + '/_site';

var Generator = module.exports = function(config) {
  var self = this;

  config.asset_path = this.asset_path.bind(this);
  config.asset = this.asset.bind(this);

  this.config = config;

  self.asset_paths = {};
  self.cbs = {};

  if (cluster.isMaster) self.spawnWorkers();
};

Generator.prototype.spawnWorkers = function() {
  var self = this;
  self.freeWorkers = [];

  cluster.setupMaster({
    exec: __dirname + '/fileGeneratorWorker.js'
  });

  for (var i = 0; i < self.config.workers; i++) {
    var w = cluster.fork();
    self.freeWorkers.push(w);

    w.send({
      config: self.config,
      asset_paths: self.asset_paths
    });

    w.on('message', function(msg) {
      if (msg.asset_paths && Object.keys(msg.asset_paths).length) {
        for (var i in msg.asset_paths) self.asset_paths[i] = msg.asset_paths[i];
      }
      if (msg.file) {
        self.freeWorkers.push(this);
        if (self.cbs[msg.file]) self.cbs[msg.file](msg.err);
      }
    });
  }
};

Generator.prototype.run = function(files, cb) {
  var self = this;

  if (self.freeWorkers.length !== Object.keys(cluster.workers).length) {
    cli.info('Not all workers are free - waiting to regenerate');
    setTimeout(self.run.bind(self, files, cb), 1000);
  }

  cli.info('Generating site');

  var _cb = function() {
    _cb = function(){};
    cb.apply(this, arguments);
  };

  self.deleteSite(function() {
    self.cacheAssets = {};
    self.process(files, _cb);
  });
};

Generator.prototype.process = function(files, cb) {
  var self = this;

  var ejsFiles = files.filter(function(f) { return f.slice(-4) === '.ejs'; });
  var otherFiles = files.filter(function(f) { return ejsFiles.indexOf(f) === -1; });

  if (files.length > 1) cli.progress(0);

  var doneCount = 0;

  var processGroup = function(group, done) {
    async.eachLimit(group, Object.keys(cluster.workers).length, function(f, dun) {
      self.processFile(f, false, function() {
        if (files.length > 1) cli.progress(++doneCount / files.length);
        dun.apply(this, arguments);
      });
    }, done);
  };

  async.series([
    processGroup.bind(this, otherFiles),
    processGroup.bind(this, ejsFiles)
  ], cb);
};

Generator.prototype.processFile = function(file, liveGen, cb) {
  var self = this;

  if (!self.freeWorkers.length) return cb('no workers');

  self.freeWorkers.shift().send({
    asset_paths: self.asset_paths,
    file: file,
    liveGen: liveGen
  });
  self.cbs[file] = function() {
    delete self.cbs[file];
    cb();
  };
};

Generator.prototype.deleteSite = function(cb) {
  fs.remove('./_site', cb);
};

Generator.prototype.asset = function(path) {
  path = this.asset_path(path, true);

  var d;
  try {
    d = fs.readFileSync(_site + path).toString();
  } catch(e) {
    try {
      d = fs.readFileSync(root + path).toString();
    } catch(e) {
      console.error('asset not found', e);
    }
  }
  return d;
};

Generator.prototype.asset_path = function(path, noHost) {
  if (!this.config.asset_paths) return path;

  var extension = path.split('.').pop();
  if (extension !== 'css' && extension !== 'js') return path;

  return this.asset_paths[path] ? (noHost ? '' : this.config.asset_host) + this.asset_paths[path] : path;
};

