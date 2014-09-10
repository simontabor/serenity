module.exports = {
  // array of browser options for autoprefixer
  autoprefixer: [],
  // folder patterns to ignore
  ignore: [ '/_site', '/.git', '/node_modules' ],
  // files with these extensions will be parsed and output
  extensions: ['*'],
  // define an asset host (such as a CDN) for all compiled assets
  asset_host: '',
  // number of generation workers to spawn and use
  workers: require('os').cpus().length,
  // whether to parse <markdown> or <md> elements as markdown.
  // set to the `marked` configuration object.
  // if markdown.highlight is truthy, we'll use highlight.js on code blocks
  markdown: false
};
