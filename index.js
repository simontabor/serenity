#!/usr/bin/env node

var cli = require('cli');
var Serenity = require('./lib/Serenity');

cli.parse({
  'no-server': [false, 'Don\'t start a server and exit after generation', 'boolean', false],
  port:  ['p', 'Listen on this port - overrides any config values', 'number', 4000],
  convert: ['c', 'Convert Jekyll (YAML with Liquid) site to Serenity (JSON with EJS)'],
  version: ['v','Shows the current Serenity version'],
  asset_host: ['a', 'Define an asset host (such as a CDN) for all compiled assets', 'string', ''],
  live_load: [ 'l', 'Generate assets on the fly as they\'re requested', 'boolean', false ],
  watch: [ 'w', 'Watch the directory for changes and regenerate', 'boolean', true ]
});


cli.main(function(args, options) {
  var serenity = new Serenity(options);
  serenity.start();
});
