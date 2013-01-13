var config = {
	watchr: {
    "path": process.cwd(),
		"ignoreCommonPatterns": true,
    "ignorePaths": [process.cwd()+'/_site']
	},
  extensions: ['ejs'] // files with these extensions will be parsed and output
  
};

module.exports = config;