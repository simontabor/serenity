var ejs = require('ejs-templr'),
fs = require('fs-extra'),
cli = require('cli'),
less = require('less'),
root = process.cwd();

module.exports = function(files,config) {
  var read = function(filepath,path) {
    var pathy = path.split('.');
    var ext = pathy[pathy.length-1];
    if (ext == 'ejs') {
      return renderejs(filepath,path);
    }
    if (ext == 'less') {
      return compileLess(filepath,path);
    }

    fs.copy(filepath,'_site/'+path); // just copy the file over
  };

  var renderejs = function(filepath,path) {
    path = path.replace('.ejs','.html');
    var opts = {
      path: path
    };
    var html = ejs.renderFile(filepath,{
      page: opts,
      site: config
    },function(err,html) {
      if (err) return cli.error(err);
      fs.writeFile('./_site'+path,html,function(err) {
        if (err) cli.error('error writing file ' + err);
      });
    });
  };

  var compileLess = function(filepath, path) {
    var splitPath = filepath.split('/');
    var filename = splitPath.pop();
    var context = splitPath.join('/');
    var newpath = path.replace('.less', '.css').replace('less/','css/');


    var parser = new(less.Parser)({
      paths: [context],
      filename: filename // Specify a filename, for better error messages
    });

    fs.readFile(filepath, 'utf-8', function(err, file) {

      if (file.split('\n')[0].indexOf('serenity') === -1) {
        return fs.copy(filepath,'_site/'+path);
      }

      parser.parse(file, function (e, tree) {
        if (e) {
          console.error(e);
          return cli.error('error parsing less');
        }
        var css = tree.toCSS({ compress: true }); // Minify CSS output

        fs.writeFile('./_site'+newpath, css, function(err) {
          if (err) cli.error('error writing file ' + err);
        });
      });


    });
  };

  fs.remove('./_site',function() {
    cli.debug('Deleted ./_site');

    fs.mkdir('./_site',function() {
     cli.debug('Created ./_site');
      for (var i = 0; i< files.length; i++) {
        var path = files[i].substr(1,files[i].length);
        var patharr = files[i].substr(2,files[i].length).split('/');
        if (patharr[0].substr(0,1) == '_') continue;
        var filename = patharr.pop();
        fs.mkdirs('./_site/'+patharr.join('/')+'/',function(file,pathy,err) {
          if (err) cli.error('error making dir ' + err);
          read(file,pathy);
        }.bind(this,files[i],path));
      }
    });
  });
};
