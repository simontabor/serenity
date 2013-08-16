var config = {
	watchr: {
    "path": process.cwd(),
    "ignoreCommonPatterns": true,
    "ignorePaths": [process.cwd()+'/_site']
	},
  ignore: ['/_site','/.git'],
  extensions: ['*'], // files with these extensions will be parsed and output
  asset_host: ''
};

module.exports = config;
