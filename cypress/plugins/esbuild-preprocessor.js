const {build} = require('esbuild');
const path = require('path');
const bundles = {};

module.exports.esbuildPreprocessor = function (options) {
    options = options || {};

    return (file) => {
        const filePath = file.filePath;

        if (bundles[filePath]) {
            return bundles[filePath];
        }

        const outfile = path.extname(file.outputPath) === '.js' ? file.outputPath : `${file.outputPath}.js`;
        const entryPoints = [filePath].concat(options.additionalEntries || []);

        return (bundles[filePath] = build({
            entryPoints,
            outfile,
            resolveExtensions: ['.ts', '.js', '.mjs', '.json'],
            minify: false,
            bundle: true,
            ...options,
        })
            .then(() => {
                bundles[filePath] = undefined;
                return outfile;
            })
            .catch((error) => {
                bundles[filePath] = undefined;
                throw error;
            }));
    };
};
