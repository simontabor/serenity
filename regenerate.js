module.exports = function(root,files,config) {
	var ejs = require('ejs'),
	fs = require('fs'),
	rm = require('rimraf'),
	cli = require('cli');

  var count = 0;
  var made = function(total) {
    if (total == count++) {
      // all folders have been created
    }

  };
  var render = function(file,path) {
   fs.readFile(file,'ascii',function(err,file) {
    var opts;
    try {
      opts = JSON.parse(file.split('______')[0]);
    }catch(e) {
      opts = {};
    }
    console.log(opts);
    path[path.length -1] = path[path.length-1].replace('.ejs','.html');
    opts.path = path.join('/');
    var html = ejs.render(file.split('______')[1] || file,{
      page: opts,
      site: config || {}
    });
    fs.writeFile(root+'/_site/'+path.join('/'),html,function(err) {
    });
  });
 };

 rm(root+'/_site',function() {
  cli.debug('Deleted '+root+'/_site');
  fs.mkdir(root+'/_site',function() {
   cli.debug('Created '+root+'/_site');
   for (var i = 0; i< files.length; i++) {
    var path = files[i].split(root+'/')[1].split('/');
    var filename = path[path.length -1];
    if (path[0].indexOf('_') !== 0 && filename != 'config.json') {

          // make directories
          for (var j=0;j<path.length-1;j++) {
            var dir = '';
            for (var p = 0; p<j;p++) {
              dir += '/'+path[p];
            }
            fs.mkdir(root+'/_site'+dir+'/'+path[j], made(files.length));
          }
          var ext = filename.split('.');
          ext = ext[ext.length-1];
          if (ext == 'ejs') {
            render(files[i],path);
          }
        }else{
          made(files.length);
        }
      }
    });
});
};