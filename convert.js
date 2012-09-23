var cli = require('cli');
var fs = require('fs-extra');
var yaml = require('js-yaml');

var converter = function() {
  
};
converter.prototype.run = function(files) {
  var self = this;
  cli.ok('Converting from Jekyll to Templr');
  self.backup(function() {
    for (var i = 0; i < files.length; i++) {
      var ext = files[i].split('.').pop();
      if (ext == 'html') {
        self.convert(files[i]);
      }
      if (files[i] == './_config.yml') {
        fs.readFile('./_config.yml','utf-8',function(err,data) {
          if (err) return cli.error('Error reading ./_config.yml');
          var json = self.convertyml(data);
          fs.writeFile('./templr.json', JSON.stringify(json,null,2), function (err) {
            if (err) return cli.error(err);
            cli.debug('Converted and saved config');
          });
        });
        
      }
    }
  });
};

converter.prototype.backup = function(cb) {
  fs.copy('./','../_templrbackup',function(err) {
    if (err) {
      cli.error(err);
      cli.fatal('Could not backup directory to ../_templrbackup');
    }
    cli.ok('Backed up directory to ../_templrbackup');
    cb();
  });
};

converter.prototype.convert = function(file) {
  var self = this;
  fs.readFile(file,'utf-8',function(err,data) {
    if (err) return cli.error(err);
    var yamlsplit = data.split(/---\n/);
    var json;
    if (yamlsplit[0] === '' && yamlsplit[2]) {
      json = {};
      // we have YAML at the top of the file, probably.
      try {
        json = JSON.stringify(yaml.load(yamlsplit[1]),null,2);
      }catch(e) {
        // error converting stuffs, we can't really know if its just from other text though
      }
      yamlsplit.shift();
      yamlsplit.shift(); // remove the 1st 2 elements
    }
    var conversion = self.translateLiquid(yamlsplit.join(''));
    if (json) {
      conversion = json+'\n______\n'+conversion;
    }
    fs.writeFile(file,conversion,function(err) {
      if (err) {
        cli.error(err);
        cli.error('Error converting file '+file);
      }
    });

  });
};

converter.prototype.convertyml = function(str) {
  var resp = {};
  try {
    resp =yaml.load(str);
  }catch(e) {
    cli.error(e);
  }
  return resp;
};

converter.prototype.translateLiquid = function(str) {
  var self = this;
  str = str.replace(/\{\{(.*?)\}\}/g,function(s,main) {
    if (main.split('|')[1]) {
      // all the additional jekyll filters are in ejs-templr
      // luckily the format is the same!
      return '<%: '+main+' %>';
    }else{
      return '<%= '+main+' %>';
    }
  });
  str = str.replace(/\{%(.*?)%\}/g,function(s,main) {
    var splitty = main.split(' ');
    if (splitty[0] === '') splitty.shift();
    if (splitty[splitty.length-1] === '') splitty.pop();
    var fctn = splitty.shift();
    // check for many things
    var statement = splitty.join(' ');
    switch(fctn) {
      case 'if':
        return '<% if ('+statement+') { %>';
      case 'else':
        return '<% } else { %>';
      case 'elsif':
        return '<% } else if ('+statement+') { %>';
      case 'unless':
        return '<% if (!('+statement+')) { %>';
      case 'for':
        // unfortunately for i in arr returns the actual element of the array in liquid
        // so we need to do smart stuff later on
        return '<% for (var '+statement+') { %>';
      case 'include':
        return '<% include '+statement+' %>';
      case 'assign':
        return '<% var '+statement+' %>';
      case 'comment':
        return '<% /* %>';
      case 'endcomment':
        return '<% */ %>';
    }
    
    if (fctn.substr(0,3) == 'end') return '<% } %>';

    console.log(fctn,statement);
    return '<% UNKNOWN TAG '+fctn+''+statement+' %>';
  });

  return str;

};

module.exports = new converter();