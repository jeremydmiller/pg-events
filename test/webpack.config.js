module.exports = {
    entry: "./client/components/*.*",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    resolve: {
    // Allow to omit extensions when requiring these files
    	extensions: ['', '.js', '.jsx']
  	},
    module: {
        loaders: [
            { test: /\.css$/, loader: "style!css" },
            { test: /\.jsx$/, loader: 'jsx' },
        ]
    }
};
