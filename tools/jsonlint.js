var fs = require('fs');
var path = require('path');

function findJsonFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).reduce(function (files, entry) {
        var entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return files.concat(findJsonFiles(entryPath));
        }

        if (entry.isFile() && path.extname(entry.name) === '.json') {
            files.push(entryPath);
        }

        return files;
    }, []);
}

var files = [path.resolve('package.json')].concat(findJsonFiles(path.resolve('src')));

files.forEach(function (file) {
    JSON.parse(fs.readFileSync(file, 'utf8'));
});
