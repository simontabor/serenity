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
    fs.unlink(file,function(err) {
      if (err) {
        cli.error(err);
        cli.error('Error deleting file '+file);
      }
    });
    fs.writeFile(file.replace('.html','.ejs'),conversion,function(err) {
      if (err) {
        cli.error(err);
        cli.error('Error writing file '+file.replace('.html','.ejs'));
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
        return '<% if ('+statement.replace(/ or /g,' || ').replace(/ and /g,' && ')+') { %>';
      case 'else':
        return '<% } else { %>';
      case 'elsif':
        return '<% } else if ('+statement.replace(/ or /g,' || ').replace(/ and /g,' && ')+') { %>';
      case 'unless':
        return '<% if (!('+statement.replace(/ or /g,' || ').replace(/ and /g,' && ')+')) { %>';
      case 'for':
        // unfortunately for i in arr returns the actual element of the array in liquid
        // so we need to do smart stuff later on
        return '<% for (var '+statement+') { %>';
      case 'endfor':
        return '<% endfor %>';
      case 'include':
        return '<% include '+statement+' %>';
      case 'assign':
        return '<% var '+statement+' %>';
      case 'comment':
        return '<% /* %>';
      case 'endcomment':
        return '<% */ %>';
      case 'capture':
        return '<% capture %>';
      case 'endcapture':
        return '<% endcapture %>';
      case 'case':
        return '<% switch ('+statement+') { %>';
      case 'endcase':
        return '<% endswitch %>';
    }
    
    if (fctn.substr(0,3) == 'end') return '<% } %>';

    console.log(fctn,statement);
    return '<% UNKNOWN TAG '+fctn+''+statement+' %>';
  });
  str = str.replace(/<% capture %>(.*?)<% endcapture %>/g,function(s,main) {
    cli.info('CAPTURE');
    console.log(main);
    return s;
  });
  str = str.replace(/<% for (.*?) { %>((.|\n)*?)<% endfor %>/g,function(s,statement,main) {
    cli.info('FOR LOOP');
    var vars = statement.split(' ');
    vars.shift(); //remove var
    var orig = vars.shift();
    if (vars[0] == 'in') vars.shift();
    var variable = vars[0].split(')')[0];

    var limit = variable+'.length';
    if (statement.split('limit:')[1]) {
      // limit is defined;
      limit = statement.split('limit:')[1].split(' ')[0];
    }
    var offset = '0';
    if (statement.split('offset:')[1]) {
      // offset is defined
      offset = statement.split('offset:')[1].split(' ')[0];
    }
    if (~statement.indexOf('reversed')) {
      return '<% /* reverse me */ %>';
    }

    return '<% var forloop = {length: ('+limit+'-'+offset+'), first:true,last:false,rindex: ('+limit+'-'+offset+')}; for (forloop.index = '+offset+'; forloop.index < '+limit+'; forloop.index++) { '+
      'var '+orig+' = '+variable+'[forloop.index]; forloop.first = ('+offset+' == forloop.index); forloop.last = ('+limit +' == forloop.index) %>'+
      main+
      '<% } %>';

  });
  str = str.replace(/<% switch (.*?) { %>((.|\n)*?)<% endswitch %>/g,function(s,statement,main) {
    cli.info('SWITCH');
    console.log(statement,main);
    return s;
  });
  return str;

};

module.exports = new converter();