const {build} = require('esbuild');
const path = require('path');
const fs = require('fs');
const bundles = {};
const watching = new Set();

module.exports.esbuildPreprocessor = function (options) {
    options = options || {};

    return (file) => {
        const filePath = file.filePath;

        if (bundles[filePath]) {
            return bundles[filePath];
        }

        const outfile = path.extname(file.outputPath) === '.js' ? file.outputPath : `${file.outputPath}.js`;
        const entryPoints = [filePath].concat(options.additionalEntries || []);

        if (file.shouldWatch) {
            watch(filePath, {
                onInit: (watcher) => file.on('close', () => watcher.close()),
                onChange: () => file.emit('rerun'),
            });
        }

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

function watch(file, callback) {
    if (watching.has(file)) {
        return;
    }

    const emitter = fs.watch(file, {encoding: null}, (event) => {
        if (event === 'change') {
            callback.onChange();
        }
    });

    callback.onInit(emitter);

    watching.add(file);

    emitter.on('close', () => {
        watching.delete(file);
    });

    emitter.on('error', (error) => {
        console.error(error);
        watching.delete(file);
    });
}