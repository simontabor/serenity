var ejs = require('ejs'),
fs = require('fs'),
rm = require('rimraf'),
cli = require('cli');

module.exports = function(files,config) {

  var read = function(filepath,path) {
    fs.readFile(filepath,'ascii',function(err,file) {
      if (err) {
        cli.error('Error reading '+filepath);
        return;
      }
      pathy = path.split('.');
      var ext = pathy[pathy.length-1];
      pathy[pathy.length-1] = 'html';
      if (ext == 'ejs') {
        renderejs(file,path);
      }
    });
  };

  var renderejs = function(file,path) {
    var opts;
    try {
      opts = JSON.parse(file.split('______')[0]);
    }catch(e) {
      cli.info('No config specified for '+path);
      opts = {};
    }
    path = path.replace('.ejs','.html');
    opts.path = path;
    var html = ejs.render(file.split('______')[1] || file,{
      page: opts,
      site: config
    });
    fs.writeFile('./_site'+path,html,function(err) {
      if (err) cli.error(err);
    });
  };

  rm('./_site',function() {
    cli.debug('Deleted ./_site');
    fs.mkdir('./_site',function() {
     cli.debug('Created ./_site');
      for (var i = 0; i< files.length; i++) {
        var path = files[i].substr(1,files[i].length);
        var patharr = files[i].substr(2,files[i].length).split('/');
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