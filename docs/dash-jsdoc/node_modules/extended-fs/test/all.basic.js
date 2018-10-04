var assert = require('assert');
var fs = require('../extended-fs');
var path = require('path');
require('buffertools').extend();

suite('fs', function() {
    var root = __dirname;
    var dir = path.join(root, 'tree');
    var copiedFilename = path.join(root, 'aCopy');
    var copiedDirectory = path.join(root, 'treeCopy');

    function fileIsSameAsFile(filepathA, filepathB) {
        var contentsA = fs.readFileSync(filepathA);
        var contentsB = fs.readFileSync(filepathB);

        return contentsA.equals(contentsB);
    }

    function directoryIsSameAsDirectory(dirA, dirB) {
        var filesA = fs.readdirSync(dirA);
        var filesB = fs.readdirSync(dirB);

        if (!arraysAreEqual(filesA, filesB)) {
            return false;
        }

        var i = 0;
        var length = filesA.length;
        var fileA;
        var fileB;
        for (; i < length; i++) {
            fileA = path.join(dirA, filesA[i]);
            fileB = path.join(dirB, filesA[i]);

            var statsA = fs.statSync(fileA);
            var statsB = fs.statSync(fileB);

            if (statsA.isDirectory() !== statsB.isDirectory()) {
                return false;
            }

            if (statsA.isDirectory()) {
                if (!directoryIsSameAsDirectory(fileA, fileB)) {
                    return false;
                }
            } else {
                if (!fileIsSameAsFile(fileA, fileB)) {
                    return false;
                }
            }
        }

        return true;
    }

    function arraysAreEqual(arrayA, arrayB) {
        if (arrayA.length !== arrayB.length) {
            return false;
        }

        for (var i = 0; i < arrayA.length; i++) {
            if (arrayB.indexOf(arrayA[i]) === -1) {
                return false;
            }
        }

        for (var i = 0; i < arrayB.length; i++) {
            if (arrayA.indexOf(arrayB[i]) === -1) {
                return false;
            }
        }

        return true;
    }

    function getAllFilesInDirectory(dir) {
        var files = fs.readdirSync(dir);

        var i = 0;
        var length = files.length;
        var filepath;
        var stats;
        var subfiles;
        for (; i < length; i++) {
            files[i] = filepath = path.join(dir, files[i]);
            stats = fs.statSync(filepath);

            if (stats.isDirectory()) {
                subfiles = getAllFilesInDirectory(filepath);
                Array.prototype.push.apply(files, subfiles);
            }
        }

        return files;
    }

    test('is not be native fs', function() {
        assert(fs !== require('fs'));
    });

    test('has the same values for every property that has a matching key in fs', function() {
        var key;
        var nfs = require('fs');
        for (key in nfs) {
            if (nfs.hasOwnProperty(key)) {
                assert(fs[key] === nfs[key], 'Unequal value for ' + key);
            }
        }
    });

    test('copies a file synchronously', function() {
        var original = path.join(dir, 'a', '0');

        fs.copyFileSync(original, copiedFilename);
        assert(fs.existsSync(copiedFilename), 'Copy was not created');

        assert(fileIsSameAsFile(original, copiedFilename), 'Copy and original are unequal');
        fs.unlinkSync(copiedFilename);
    });

    test('copies a file asynchronously', function(done) {
        var original = path.join(dir, 'a', '0');

        fs.copyFile(original, copiedFilename, function(error) {
            assert(!error, 'An error occurred ' + error);
            assert(fs.existsSync(copiedFilename), 'Copy was not created');

            var originalContents = fs.readFileSync(original);
            var copyContents = fs.readFileSync(copiedFilename);

            assert(fileIsSameAsFile(original, copiedFilename), 'Copy and original are unequal');
            fs.unlinkSync(copiedFilename);

            done();
        });
    });

    test('copied files overwrite existing files', function() {
        var original = path.join(dir, 'a', '0');
        var newOriginal = path.join(dir, 'a', '1');

        fs.copyFileSync(original, copiedFilename);

        assert(fileIsSameAsFile(original, copiedFilename), 'Copy and original are unequal');

        fs.copyFileSync(newOriginal, copiedFilename);

        assert(fileIsSameAsFile(newOriginal, copiedFilename), 'Copy and new original are unequal');

        assert(!fileIsSameAsFile(original, copiedFilename), 'Copy and original are equal');

        fs.unlinkSync(copiedFilename);
    });

    test('copies a directory synchronously', function() {
        fs.copyDirSync(dir, copiedDirectory);

        assert(fs.existsSync(copiedDirectory), 'Copied directory exists');

        assert(directoryIsSameAsDirectory(dir, copiedDirectory), 'Directories are unequal');
    });

    test('removes a directory synchronously', function() {
        fs.copyDirSync(dir, copiedDirectory);
        fs.rmDirSync(copiedDirectory);

        assert(!fs.existsSync(copiedDirectory), 'Copied directory no longer exists');
    });

    test('removes a directory asynchronously', function(done) {
        fs.copyDirSync(dir, copiedDirectory);
        fs.rmDir(copiedDirectory, function() {
            assert(!fs.existsSync(copiedDirectory), 'Copied directory no longer exists');

            done();
        });
    });

    test('copies a directory asynchronously', function(done) {
        fs.copyDir(dir, copiedDirectory, function(error) {
            assert(!error, 'An error occurred ' + error);

            assert(fs.existsSync(copiedDirectory), 'Copied directory exists');

            assert(directoryIsSameAsDirectory(dir, copiedDirectory), 'Directories are unequal');

            fs.rmDirSync(copiedDirectory);

            done();
        });
    });

    test('throws an error when trying to synchronously copy a file that doesn\'t exist', function() {
        var anErrorHasOccurred = false;
        try {
            fs.copyFileSync('./nonExistentFile', copiedFilename);
        } catch (error) {
            anErrorHasOccurred = true;
        }
        
        assert(anErrorHasOccurred, 'copyFileSync threw no error');
    });

    test('throws an error when trying to asynchronously copy a file that doesn\'t exist', function(done) {
        fs.copyFile('./nonExistentFile', copiedFilename, function(error) {
            assert(error, 'copyFile threw no error');

            done();
        });
    });

    test('throws an error when trying to synchronously copy a directory that doesn\'t exist', function() {
        var anErrorHasOccurred = false;
        try {
            fs.copyDirSync('./nonExistentDirectory', copiedDirectory);
        } catch (error) {
            anErrorHasOccurred = true;
        }
        
        assert(anErrorHasOccurred, 'copyDirSync threw no error');
    });

    test('throws an error when trying to asynchronously copy a directory that doesn\'t exist', function(done) {
        fs.copyDir('./nonExistentDirectory', copiedDirectory, function(error) {
            assert(error, 'copyFile threw no error');

            done();
        });
    });

    test('throws an error when trying to synchronously recursively remove a directory that doesn\'t exist', function() {
        var anErrorHasOccurred = false;
        try {
            fs.rmDirSync(copiedDirectory);
        } catch (error) {
            anErrorHasOccurred = true;
        }
        
        assert(anErrorHasOccurred, 'rmDirSync threw no error');
    });

    test('throws an error when trying to asynchronously recursively remove a directory that doesn\'t exist', function(done) {
        fs.rmDir(copiedDirectory, function(error) {
            assert(error, 'rmDir threw no error');

            done();
        });
    });

    test('synchronously mkdir recursively', function() {
        var targetDir = path.join(root, 'a', 'b', 'c', 'd', 'e', 'f');
        fs.mkdirpSync(targetDir);

        assert(fs.statSync(targetDir).isDirectory());

        fs.rmDirSync(path.join(root, 'a'));
    });

    test('asynchronously mkdir recursively', function(done) {
        var targetDir = path.join(root, 'a', 'b', 'c', 'd', 'e', 'f');
        fs.mkdirp(targetDir, function(error) {
            assert(fs.statSync(targetDir).isDirectory());

            fs.rmDirSync(path.join(root, 'a'));

            done();
        });
    });

    test('asynchronously recurses through all files of a directory', function(done) {
        var files = getAllFilesInDirectory(dir);
        var rFiles = [];

        fs.recurse(dir, function(file, stats) {
            rFiles.push(file);
        }, function(error) {
            assert(!error, 'Recurse produces an error ' + error);

            assert(rFiles.length === files.length, 'Recursive file count is unequal');
            var i = 0;
            var length = files.length;
            for (; i < length; i++) {
                assert(rFiles.indexOf(files[i]) !== -1, 'File not discovered via recursion ' + files[i]);
            }

            done();
        });
    });

    test('asynchronously recurses through a directory with no files', function(done) {
        fs.recurse(path.join(root, 'empty'), function(file, stats) {

        }, function(error) {
            assert(!error, 'Recurse produces an error ' + error);

            done();
        });
    });

    test('asynchronously copies a directory with no files', function(done) {
        fs.copyDir(path.join(root, 'empty'), copiedDirectory, function(error) {
            assert(fs.existsSync(copiedDirectory), 'Copied directory does not exist');

            fs.rmDirSync(copiedDirectory);

            done();
        });
    });

    test('synchronously copies a directory with no files', function() {
        fs.copyDirSync(path.join(root, 'empty'), copiedDirectory);
        assert(fs.existsSync(copiedDirectory), 'Copied directory does not exist');

        fs.rmDirSync(copiedDirectory);
    });

    test('asynchronously removes a directory with no files', function(done) {
        fs.copyDirSync(path.join(root, 'empty'), copiedDirectory);
        fs.rmDir(copiedDirectory, function(error) {
            assert(!fs.existsSync(copiedDirectory), 'Copied directory still exists');

            done();
        });
    });

    test('synchronously recurses through a directory with no files', function() {
        var anErrorHasOccurred = false;
        try {
            fs.recurseSync(path.join(root, 'empty'), function(file, stats) {});
        } catch (error) {
            anErrorHasOccurred = true;
        }

        assert(!anErrorHasOccurred, 'An error has occurred in asynchronously recursion with no files');
    });

    test('synchronously recurses through all files in a directory', function() {
        var files = getAllFilesInDirectory(dir);
        var rFiles = [];

        fs.recurseSync(dir, function(file, stats) {
            rFiles.push(file);
        });

        assert(rFiles.length === files.length, 'Recursive file count is unequal');
        var i = 0;
        var length = files.length;
        for (; i < length; i++) {
            assert(rFiles.indexOf(files[i]) !== -1, 'File not discovered via recursion ' + files[i]);
        }
    });

    test('cancels synchronous recursive search on the current branch if the operation returns false', function() {
        var numberOfFilesInDir = fs.readdirSync(dir).length;
        var numberOfTimes = 0;
        fs.recurseSync(dir, function(file, stats) {
            numberOfTimes++;
            return false;
        });

        assert(numberOfTimes === numberOfFilesInDir, 'Recursive operation should have been performed only once, but was ' + numberOfTimes);
    });

    test('cancels asynchronous recursive search on the current branch if the operation returns false', function(done) {
        var numberOfFilesInDir = fs.readdirSync(dir).length;
        var numberOfTimes = 0;
        fs.recurse(dir, function(file, stats) {
            numberOfTimes++;
            return false;
        }, function(error) {
            assert(!error, 'Recurse produces an error ' + error);
            assert(numberOfTimes === numberOfFilesInDir, 'Recursive operation should have been performed only once, but was ' + numberOfTimes);
            done();
        });
    });
});