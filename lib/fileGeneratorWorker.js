var FileGenerator = require('./FileGenerator');
var Generator = require('./Generator');

var gen = new Generator({});

process.on('message', function(msg) {
  if (msg.config) {
    gen.config = msg.config;
    gen.config.asset_path = gen.asset_path.bind(gen);
    gen.config.asset = gen.asset.bind(gen);
  }
  if (msg.asset_paths) gen.asset_paths = msg.asset_paths;
  if (msg.liveGen) gen.liveGen = msg.liveGen;

  if (msg.file) {
    var fg = new FileGenerator(msg.file, gen);
    fg.run(function(err) {
      process.send({
        file: msg.file,
        err: err,
        asset_paths: gen.asset_paths
      });
    });
  }
});
