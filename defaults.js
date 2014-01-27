var config = {
	watchr: {
    "path": process.cwd(),
    "ignoreCommonPatterns": true,
    "ignorePaths": [process.cwd()+'/_site']
	},
  autoprefixer: [], // array of browser options for autoprefixer
  ignore: ['/_site','/.git'],
  extensions: ['*'], // files with these extensions will be parsed and output
  asset_host: ''
};

module.exports = config;
