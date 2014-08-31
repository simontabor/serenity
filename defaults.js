var config = {
  autoprefixer: [], // array of browser options for autoprefixer
  ignore: [ '/_site', '/.git', '/node_modules' ], // folder patterns to ignore
  extensions: ['*'], // files with these extensions will be parsed and output
  asset_host: '', // define an asset host (such as a CDN) for all compiled assets
  workers: require('os').cpus().length // number of generation workers to spawn and use
};

module.exports = config;
