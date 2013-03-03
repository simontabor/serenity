var ejs = require('ejs-templr'),
fs = require('fs-extra'),
cli = require('cli');

module.exports = function(files,config) {
  var read = function(filepath,path) {
    var pathy = path.split('.');
    var ext = pathy[pathy.length-1];
    if (ext == 'ejs') {
      return renderejs(filepath,path);
    }
    fs.copy(filepath,'_site/'+path); // just copy the file over otherwise
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
        if (err) cli.error(err);
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
        var filename = patharr[patharr.length -1];

        for (var j=0;j<patharr.length-1;j++) {
          var dir = '';
          for (var p = 0; p<=j;p++) {
            dir+=patharr[p]+'/';
          }
          fs.mkdir('./_site/'+dir);
        }
        read(files[i],path);
      }
    });
  });
};
