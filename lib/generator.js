var ejs = require('ejs-templr');
var fs = require('fs-extra');
var crypto = require('crypto');
var Mincer = require('mincer');

var sqwish = require('sqwish');
var UglifyJS = require("uglify-js");
var htmlminify = require('html-minifier').minify;


var root = process.cwd();
var _site = root + '/_site';

environment = new Mincer.Environment();
environment.appendPath(root);
environment.appendPath(_site);

var Generator = module.exports = function(files, config, cb) {
  var self = this;

  self.cb = cb;

  config.asset_path = this.asset_path.bind(this);
  config.asset = this.asset.bind(this);

  this.config = config;

  var processedFiles = [];

  self.asset_paths = {};

  self.deleteSite(function() {

    var pending = files.length;

    files.forEach(function(file) {

      if (self.cancelled) {
        return self.cb('cancelled');
      }

      // remove ./
      var path = file.substr(2);

      var patharr = path.split('/');
      var filename = patharr.pop();

      var dir = patharr.join('/');

      var extension = filename.split('.').pop();

      // check for serenity hidden dir (e.g. _includes) or genuine hidden
      var initial = (patharr[0] || '').substr(0,1);

      if (initial === '_' || initial === '.' || filename.substr(0,1) === '.') {
        if (!--pending) self.process();
        return;
      }

      fs.mkdirs('./_site/' + dir.replace('less/','css/') + '/',function(err) {

        if (['ejs', 'html', 'less', 'css', 'js'].indexOf(extension) === -1) {
          // non processed file extension, just copy
          fs.copy(file, _site + '/' + path, function() {
            if (!--pending) self.process(processedFiles);
          });
          return;
        }

        fs.readFile(file, function(e, data) {
          data = data.toString();

          processedFiles.push({
            absolute: file,
            relative: path,
            name: filename,
            extension: extension,
            data: data,
            compile: data.split('\n')[0].indexOf('serenity') !== -1,
            savePath: path.replace('less/','css/').replace(/\.less$/,'.css').replace(/\.ejs$/, '.html')
          });
          if (!--pending) self.process(processedFiles);

        });



      });

    });

  });
};

Generator.prototype.process = function(files) {
  var self = this;

  // ejs files need to be last
  files.sort(function(a,b) {
    return a.extension === 'ejs' ? 1 : -1;
  });


  var index = -1;
  var doNext = function() {
    if (self.cancelled) {
      return self.cb('cancelled');
    }

    if (files[++index]) {
      self.processFile(files[index], doNext);
    } else {
      self.cb();
    }
  };
  doNext();

};

Generator.prototype.processFile = function(file, cb) {
  var self = this;

  if (file.extension === 'ejs') {
    self.renderEJS(file, function(err, html) {
      self.save(file, html, cb);
    });
    return;
  }

  var asset = environment.findAsset(file.relative);
  if (file.compile) {
    this.compile(file, asset, function(data) {

      self.save(file, data, cb);
    });
    return;
  }
  if (file.extension === 'less') return cb();

  if (file.name === 'serenity.js') return cb();


  self.save(file, file.data, cb);
};

Generator.prototype.compile = function(file, asset, cb) {
  asset.compile(function(err, ass) {
    if (err || !ass) {
      console.log('error compiling ' + file.relative);
      console.error(err);
      return cb(null);
    }
    var info = ass.toString();

    if (file.extension === 'less' || file.extension === 'css') {
      info = sqwish.minify(info);
      return cb(info);
    }

    if (file.extension === 'js') {
      info = UglifyJS.minify(info, {
        fromString: true,
        compress: true,
        mangle: true
      }).code;
      return cb(info);
    }

    console.log('UNCAUGHT', info);

  });
};

Generator.prototype.save = function(file, data, cb) {
  // .replace('/less/', '/css/').replace('.less','.css')
  // .replace('.ejs', '.html'),

  if (this.cancelled) return cb('cancelled');

  var filepath = file.savePath;

  var hash = false;
  var path = _site + '/' + filepath;

  if (this.config.asset_paths) {
    if (file.extension === 'css' || file.extension === 'js' || file.extension === 'less') {
      hash = crypto.createHash('md5').update(data).digest('hex');

      var fn = filepath.replace(/(\.[^\.]*)$/, '-'+hash+'$1');

      path = _site + '/' + fn;
      this.asset_paths['/' + filepath] = '/' + fn;
    }
  }

  fs.writeFile(path, data, cb);
};

Generator.prototype.deleteSite = function(cb) {
  fs.remove('./_site', cb);
};

Generator.prototype.renderEJS = function(file, cb) {

  var opts = {
    path: '/' + file.relative
  };
  ejs.renderFile(file.absolute, {
    page: opts,
    site: this.config
  }, function(err,html) {

    if (err || !html) {
      return cb(err, html);
    }

    html = html.replace(
      /(<script[^>]*?>)(?!<\/script>)((?:.*?\n*?)*?)(<\/script>)/g,
      function(match, open, body, close){
        body = UglifyJS.minify(body, {
          fromString: true,
          compress: true,
          mangle: true
        }).code;
        body = body.replace(/<\/script>/g, '<\\/script>');
        return open + body + close;
      }
    );

    html = htmlminify(html, {
      collapseWhitespace: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
      removeOptionalTags: true,
      removeComments: true
    });

    cb(err, html);
  });
};

Generator.prototype.asset = function(path) {
  path = this.asset_path(path, true);

  return fs.readFileSync(_site + path).toString();
};

Generator.prototype.asset_path = function(path, noHost) {
  if (!this.config.asset_paths) return path;

  var extension = path.split('.').pop();
  if (extension !== 'css' && extension !== 'js') return path;

  return this.asset_paths[path] ? (noHost ? '' : this.config.asset_host) + this.asset_paths[path] : path;
};

Generator.prototype.cancel = function() {
  this.cancelled = true;
};
