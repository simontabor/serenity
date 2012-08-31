var ejs = require('ejs'),
fs = require('fs'),
rm = require('rimraf'),
cli = require('cli');

module.exports = function(files,config) {

  var count = 0;
  var made = function(total) {
    if (total == count++) {
      // all folders have been created
    }

  };
  var renderejs = function(file,path) {
    console.log(file,path);
   fs.readFile(file,'ascii',function(err,filec) {
    console.log(err);
    var opts;
    try {
      opts = JSON.parse(filec.split('______')[0]);
    }catch(e) {
      cli.error('No config specified for '+file);
      opts = {};
    }
    path = path.replace('.ejs','.html');
    opts.path = path.split('./_site')[1];
    var html = ejs.render(filec.split('______')[1] || filec,{
      page: opts,
      site: config
    });
    fs.writeFile(path,html,function(err) {
    });
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

    var ignored = false;
    for (var j = 0;j<config.ignore.length;j++) {
      if ((filename == config.ignore[j]) || (path == config.ignore[j])) ignored = true;
    }
    if (path.indexOf('_') !== 1 && !ignored) {

          // make directories
          for (var j=0;j<patharr.length-1;j++) {
            var dir = '';
            for (var p = 0; p<=j;p++) {
              dir+=patharr[p]+'/';
            }
            console.log('mkdir '+dir);
            fs.mkdir('./_site/'+dir, made(files.length));
          }
          var ext = filename.split('.');
          ext = ext[ext.length-1];
          if (ext == 'ejs') {
            renderejs(files[i],'./_site'+path);
          }
        }else{
          made(files.length);
        }
      }
    });
});
};