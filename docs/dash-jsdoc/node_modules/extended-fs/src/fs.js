/**
 * Copyright (c) 2013 Adam Ranfelt
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';

var fs = require('graceful-fs');
var path = require('path');
var mkdirp = require('mkdirp');
var q = require('q');

/**
 * Extended form of fs to augment features that would be nice to have
 * Includes sync and async form of all augmented features
 * Includes the following operations:
 *   - copy
 *   - recursive remove
 *   - recursive make directory
 *
 * @namespace fsExtended
 */
var fsExtended = {

    /**
     * Walks through a directory asynchronously starting with the directory provided
     * Passes the filename and its stats back to the operation
     * Cancels traversal if the operation returns false
     *
     * @method recurse
     * @param {string} dir Directory to traverse
     * @param {function} operation Operation to perform on each file, if it returns false, the traversal will stop on that branch
     * @param {function} callback Callback that accepts an error as the first param
     */
    recurse: function(dir, operation, callback) {
        fs.readdir(dir, function(error, files) {
            if (error) {
                callback(error);
                return;
            }

            var i = 0;
            var length = files.length;
            var counter = 1;
            var file;
            var shouldTraverse;

            for (; i < length; i++) {
                shouldTraverse = true;

                // Capture scope
                (function(file) {

                    counter++;
                    fs.stat(file, function(error, stats) {
                        if (error) {
                            callback(error);
                            return;
                        }

                        shouldTraverse = operation(file, stats);

                        if (stats.isDirectory()) {
                            if (shouldTraverse !== false) {
                                fsExtended.recurse(file, operation, onRecurseComplete);
                            } else {
                                onRecurseComplete(null);
                            }
                        } else {
                            onRecurseComplete(null);
                        }
                    });
                }(path.join(dir, files[i])));
            }

            onRecurseComplete(null);

            function onRecurseComplete(error) {
                if (error) {
                    callback(error, false);
                    return;
                }

                counter--;
                if (counter === 0) {
                    callback(null, true);
                }
            }
        });
    },

    /**
     * Walks through a directory synchronously starting with the directory provided
     * Passes the filename and its stats back to the operation
     *
     * @method recurseSync
     * @param {string} dir Directory to traverse
     * @param {function} operation Operation to perform on each file
     */
    recurseSync: function(dir, operation) {
        var files = fs.readdirSync(dir);

        var i = 0;
        var length = files.length;
        var file;
        var stats;
        var shouldTraverse;

        for (; i < length; i++) {
            shouldTraverse = true;
            file = path.join(dir, files[i]);
            stats = fs.statSync(file);

            shouldTraverse = operation(file, stats);

            if (stats.isDirectory() && shouldTraverse !== false) {
                fsExtended.recurseSync(file, operation);
            }
        }
    },

    /**
     * Asynchronous recursive mkdir, mkdir -p
     *
     * @method mkdirp
     * @see https://github.com/substack/node-mkdirp#mkdirpdir-mode-cb
     */
    mkdirp: mkdirp,
    
    /**
     * Synchronous recursive mkdir, mkdir -p
     *
     * @method mkdirpSync
     * @see https://github.com/substack/node-mkdirp#mkdirpsyncdir-mode
     */
    mkdirpSync: mkdirp.sync,

    /**
     * Copies a file asynchronously from the source to the destination
     * Passes any errors back to the callback
     * Does not copy directories
     *
     * @method copyFile
     * @param {string} src Source File
     * @param {string} dest Destination File
     * @param {function} callback Callback that accepts an error as the first param
     */
    copyFile: function(src, dest, callback) {
        fs.readFile(src, function(error, data) {
            if (error) {
                callback(error);
                return;
            }

            if (data === null) {
                callback('Content does not exist at ' + src)
            }

            fs.writeFile(dest, data, callback);
        });
    },

    /**
     * Copies a file synchronously from the source to the destination
     * @see fsExtended#copyFile
     *
     * @method copyFileSync
     * @param {string} src Source File
     * @param {string} dest Destination File
     */
    copyFileSync: function(src, dest) {

        var readContent = fs.readFileSync(src);
        
        if (readContent === null) {
            return 'Content does not exist at ' + src;
        }

        fs.writeFileSync(dest, readContent);
    },

    /**
     * Asynchronously removes a directory and deletes all children nodes
     * Passes any error back to the callback
     *
     * @method rmDir
     * @param {string} dir Directory to remove recursively
     * @param {function} callback Callback that accepts an error as the first param
     */
    rmDir: function(dir, callback) {
        fs.exists(dir, function(exists) {
            if (!exists) {
                callback(dir + ' does not exist');
                return;
            }

            fs.readdir(dir, function(error, files) {
                if (error) {
                    callback(error);
                    return;
                }

                var i = 0;
                var length = files.length;
                var counter = 1;
                for (; i < length; i++) {
                    (function(dir, file) {
                        var filepath = path.join(dir, file);

                        counter++;
                        fs.stat(filepath, function(error, stats) {
                            if (error) {
                                callback(error);
                                return;
                            }

                            if (stats.isDirectory()) {
                                fsExtended.rmDir(filepath, onRemoveComplete);
                            } else {
                                fs.unlink(filepath, onRemoveComplete);
                            }
                        });
                    }(dir, files[i]));
                }

                // If nothing has been read, remove the directory
                if (counter === 1) {
                    fs.rmdir(dir, onRemoveComplete);
                }

                function onRemoveComplete(error) {
                    if (error) {
                        callback(error, false);
                        return;
                    }

                    counter--;
                    if (counter === 1) {
                        fs.rmdir(dir, onRemoveComplete);
                    }

                    if (counter === 0) {
                        callback(null, true);
                    }
                }
            });
        });
    },

    /**
     * Synchronously removes a directory and deletes all children nodes
     * Passes any error back to the callback
     *
     * @method rmDirSync
     * @param {string} dir Directory to remove recursively
     */
    rmDirSync: function(dir) {
        if (!fs.existsSync(dir)) {
            throw new TypeError(dir + ' does not exist');
        }

        var files = fs.readdirSync(dir);

        var i = 0;
        var length = files.length;
        var stats;
        var filepath;
        var error = null;
        for (; i < length; i++) {
            filepath = path.join(dir, files[i]);
            stats = fs.statSync(filepath);

            if (stats.isDirectory()) {
                error = fsExtended.rmDirSync(filepath);
            } else {
                error = fs.unlinkSync(filepath);
            }

            if (error) {
                return error;
            }
        }

        error = fs.rmdirSync(dir);
        if (error) {
            return error;
        }

        return null;
    },

    /**
     * Asynchronously copies a directory and all of its contents into a new directory
     * Passes any error back to the callback
     *
     * @method copyDir
     * @param {string} src Directory to copy recursively
     * @param {string} dest Target directory to copy to recursively
     * @param {function} callback Callback that accepts an error as the first param
     */
    copyDir: function(src, dest, callback) {
        fs.exists(src, function(exists) {
            if (!exists) {
                callback(src + ' does not exist');
                return;
            }

            fs.exists(dest, function(exists) {
                if (exists) {
                    fs.stat(dest, function(error, stats) {
                        if (error) {
                            callback(error);
                            return;
                        }

                        if (stats.isDirectory()) {
                            fsExtended.rmDir(dest, makeDestDir);
                        } else {
                            fs.unlink(dest, makeDestDir);
                        }
                    });
                } else {
                    makeDestDir(null);
                }

                function makeDestDir(error) {
                    if (error) {
                        callback(error);
                        return;
                    }

                    fs.mkdir(dest, function(error) {
                        if (error) {
                            callback(error);
                            return;
                        }

                        fs.readdir(src, function(error, files) {
                            if (error) {
                                callback(error);
                                return;
                            }

                            var i = 0;
                            var length = files.length;
                            var counter = 0;
                            for (; i < length; i++) {
                                (function(src, dest, file) {
                                    var srcpath = path.join(src, file);
                                    var destpath = path.join(dest, file);

                                    counter++;
                                    fs.stat(srcpath, function(error, stats) {
                                        if (error) {
                                            callback(error);
                                            return;
                                        }

                                        if (stats.isDirectory()) {
                                            fsExtended.copyDir(srcpath, destpath, onCopyComplete);
                                        } else {
                                            fsExtended.copyFile(srcpath, destpath, onCopyComplete);
                                        }
                                    });
                                }(src, dest, files[i]));
                            }

                            // Perform the callback if none have been copied
                            if (counter === 0) {
                                callback(null, true);
                            }

                            function onCopyComplete(error) {
                                if (error) {
                                    callback(error, false);
                                    return;
                                }

                                counter--;
                                if (counter === 0) {
                                    callback(null, true);
                                }
                            }
                        });
                    });
                }
            });
        });
    },

    /**
     * Synchronously copies a directory and all of its contents into a new directory
     * Passes any error back to the callback
     *
     * @method copyDirSync
     * @param {string} src Directory to copy recursively
     * @param {string} dest Target directory to copy to recursively
     */
    copyDirSync: function(src, dest) {
        var error = null;
        if (!fs.existsSync(src)) {
            throw new TypeError(src + ' does not exist');
        }

        if (fs.existsSync(dest)) {
            var stats = fs.statSync(dest);
            if (stats.isDirectory()) {
                error = fsExtended.rmDirSync(dest);    
            } else {
                error = fs.unlinkSync(dest);
            }
            
            if (error) {
                return error;
            }
        }

        error = fs.mkdirSync(dest);
        if (error) {
            return error;
        }

        var files = fs.readdirSync(src);

        var i = 0;
        var length = files.length;
        var stats;
        var srcpath;
        var destpath;
        
        for (; i < length; i++) {
            srcpath = path.join(src, files[i]);
            destpath = path.join(dest, files[i]);
            stats = fs.statSync(srcpath);

            if (stats.isDirectory()) {
                error = fsExtended.copyDirSync(srcpath, destpath);
            } else {
                error = fsExtended.copyFileSync(srcpath, destpath);
            }

            if (error) {
                return error;
            }
        }
        if (error) {
            return error;
        }

        return null;
    }
};

/**
 * Generates and produces a set of promse suffixed methods to provide a promise based API
 * Ignores any underscore prefixed, object constructor, sync, or marked invalid methods for conversion
 */
(function() {

    var funcName;
    var arraySlice = Array.prototype.slice;
    var methodExceptions = [
        'exists'
    ];

    var invalidMethods = [
        'createReadStream',
        'createWriteStream',
        'watch',
        'unwatch',
        'watchFile',
        'unwatchFile'
    ];

    for (funcName in fsExtended) {
        if (funcName.charAt(0) === '_'
            || funcName.charAt(0) === funcName.charAt(0).toUpperCase()
            || funcName.toLowerCase().indexOf('sync') !== -1
            || invalidMethods.indexOf(funcName) !== -1
        ) {
            continue;
        }

        fsExtended[funcName + 'Promise'] = generatePromiseFromNode(funcName, fsExtended[funcName]);
    }

    for (funcName in fs) {
        fsExtended[funcName] = fs[funcName];

        if (funcName.charAt(0) === '_'
            || funcName.charAt(0) === funcName.charAt(0).toUpperCase()
            || funcName.toLowerCase().indexOf('sync') !== -1
            || invalidMethods.indexOf(funcName) !== -1
        ) {
            continue;
        }

        fsExtended[funcName + 'Promise'] = generatePromiseFromNode(funcName, fs[funcName]);
    }

    /**
     * Generates a promise API driven function for the provided method
     * Routes the function to be considered an exception and use a different internal API
     *
     * @method generatePromiseFromNode
     * @param {string} methodName Name of the method passed in
     * @param {function} method Function that should be converted
     * @return {function}
     */
    function generatePromiseFromNode(methodName, method) {
        var isException = methodExceptions.indexOf(methodName) !== -1;

        return makePromiseFromNode(methodName, method, isException);
    }

    /**
     * Generates a promise API driven function for the provided method
     * Exceptional methods will always resolve their promises
     * Standard node methods will resolve or reject depending on whether or not it has an error
     *
     * @method generatePromiseFromNode
     * @param {string} methodName Name of the method passed in
     * @param {function} method Function that should be converted
     * @param {boolean} isException Flag for whether or not it is an exception
     * @return {function}
     */
    function makePromiseFromNode(methodName, method, isException) {
        var promiseFunction = function() {
            var defer = q.defer();

            var args = arraySlice.call(arguments, 0);
            if (isException) {
                args.push(resolveOnly);
            } else {
                args.push(resolveIfNoError);
            }

            method.apply(null, args);

            return defer.promise;

            function resolveOnly(/* arguments */) {
                defer.resolve.apply(defer, arguments);
            }

            function resolveIfNoError(error/*, arguments */) {
                if (error) {
                    defer.reject(error);
                }
                var args = arraySlice.call(arguments, 1);
                defer.resolve.apply(defer, args);
            }
        };

        return promiseFunction;
    }
}());

module.exports = fsExtended;
