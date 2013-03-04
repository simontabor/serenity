var config = {
	watchr: {
    "path": process.cwd(),
    "ignoreCommonPatterns": true,
    "ignorePaths": [process.cwd()+'/_site']
	},
  ignore: ['/_site'],
  extensions: ['*'] // files with these extensions will be parsed and output
};

module.exports = config;