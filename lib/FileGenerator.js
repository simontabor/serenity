var fs = require('fs-extra');
var Mincer = require('mincer');
var crypto = require('crypto');

var EJS = require('ejs2');
var ejs = new EJS();

var autoprefixer = require('autoprefixer');
var cleanCss = require('clean-css');
var UglifyJS = require('uglify-js');
var htmlminify = require('html-minifier').minify;

var root = process.cwd();
var _site = root + '/_site';

var environment = new Mincer.Environment();
environment.appendPath(root);
environment.appendPath(_site);

var FileGenerator = module.exports = function(file, generator) {
  var self = this;
  self.generator = generator;
  self.file = file;

};

FileGenerator.prototype.run = function(cb) {
  var self = this;
  var file = self.file;

  // remove ./
  var path = file.substr(2);

  var patharr = path.split('/');
  var filename = patharr.pop();

  var dir = patharr.join('/');

  var extension = filename.split('.').pop();

  // check for serenity hidden dir (e.g. _includes) or genuine hidden
  var initial = (patharr[0] || '')[0];

  if (initial === '_' || initial === '.' || filename[0] === '.') {
    return cb();
  }

  // fs.mkdirs('./_site/' + dir.replace('less/','css/') + '/',function(err) {

  if (['ejs', 'html', 'less', 'css', 'js'].indexOf(extension) === -1) {
    // non processed file extension, just copy
    fs.copy(file, _site + '/' + path, function(err) {
      cb(err);
    });
    return;
  }

  fs.readFile(file, function(err, data) {
    if (err) return cb(err);

    data = data.toString();

    var fileInfo = self.fileInfo = {
      absolute: file,
      relative: path,
      name: filename,
      extension: extension,
      data: data,
      compile: data.split('\n')[0].indexOf('serenity') !== -1,
      savePath: path.replace('less/','css/').replace(/\.less$/,'.css').replace(/\.ejs$/, '.html')
    };

    if (fileInfo.extension === 'ejs') {
      self.renderEJS(function(err, html) {
        if (err) return cb(err);
        self.save(html, cb);
      });
      return;
    }

    var asset = environment.findAsset(fileInfo.relative);
    if (fileInfo.compile) {
      self.compile(asset, function(err, data) {
        if (err) return cb(err);
        self.save(data, cb);
      });
      return;
    }
    if (fileInfo.extension === 'less') return cb();

    if (fileInfo.name === 'serenity.js') return cb();


    self.save(fileInfo.data, cb);
  });
};

FileGenerator.prototype.compile = function(asset, cb) {
  var self = this;
  var file = self.fileInfo;

  asset.compile(function(err, ass) {
    if (err || !ass) {
      console.log('error compiling ' + file.relative);
      console.error(err);
      return cb(err);
    }
    var info = ass.toString();

    if (file.extension === 'less' || file.extension === 'css') {
      info = autoprefixer({ browsers: self.generator.config.autoprefixer }).process(info).css;
      info = cleanCss().minify(info);
      return cb(err, info);
    }

    if (file.extension === 'js') {
      info = UglifyJS.minify(info, {
        fromString: true,
        compress: true,
        mangle: true
      }).code;
      return cb(err, info);
    }

    console.log('UNCAUGHT', info);

  });
};

FileGenerator.prototype.save = function(data, cb) {
  var self = this;
  var file = self.fileInfo;

  var filepath = file.savePath;

  var hash = false;
  var path = _site + '/' + filepath;

  if (self.generator.config.asset_paths && !self.generator.liveGen) {
    if (file.extension === 'css' || file.extension === 'js' || file.extension === 'less') {
      hash = crypto.createHash('md5').update(data).digest('hex');

      var fn = filepath.replace(/(\.[^\.]*)$/, '-'+hash+'$1');

      path = _site + '/' + fn;
      self.generator.asset_paths['/' + filepath] = '/' + fn;
    }
  }

  fs.outputFile(path, data, cb);
};

FileGenerator.prototype.renderEJS = function(cb) {
  var self = this;
  var file = self.fileInfo;

  var opts = {
    path: '/' + file.relative
  };

  ejs.renderSerenity(file.data, {
    filename: file.absolute,
    page: opts,
    site: self.generator.config
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
