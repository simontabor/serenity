var ejs = require('ejs-templr'),
fs = require('fs-extra'),
cli = require('cli'),
root = process.cwd();

module.exports = function(files,config) {
  var read = function(filepath,path) {
    var pathy = path.split('.');
    var ext = pathy[pathy.length-1];
    if (ext == 'ejs') {
      return renderejs(filepath,path);
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
