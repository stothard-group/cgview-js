# extended-fs

## Usage ([node](http://nodejs.org))

    npm install extended-fs

Extended functionality of fs with additional q-dependent promises adaptation of fs functions.

Utilizes the [`q`](https://npmjs.org/package/q), [`mkdirp`](https://npmjs.org/package/mkdirp), and [`graceful-fs`](https://npmjs.org/package/graceful-fs) to implement missing features and augment existing functions.

Acts as a replacement fs for the existing fs, as it copies over existing functionality from fs. In addition to the standard functions available on [node's package `fs`](http://nodejs.org/api/fs.html), this includes functions to support copying and removing directories recursively. Leverages the [`q`](https://npmjs.org/package/q) package to introduce promise driven `fs` methods.

# API

## `extended-fs.recurse(dir, operation, callback)`

Asynchronous recursive directory walk. Operation is performed on each file and provided a signature with the filepath and stats for the triggered file `operation(filepath, operation)`. If the supplied `operation` returns `false`, the recursion for that branch will stop. No arguments other than a possible error are given to the callback.

## `extended-fs.recurseSync(dir, operation)`

Synchronous recursive directory walk.

## `extended-fs.rmDir(dir, callback)`

Asynchronous recursive directory removal. No arguments other than a possible error are given to the callback.

## `extended-fs.rmDirSync(dir)`

Synchronous recursive directory removal.

## `extended-fs.copyFile(src, dest, callback)`

Asynchronous file copy. Copies the file found at `src` over to the `dest` path, overwriting `dest`. No arguments other than a possible error are given to the callback.

## `extended-fs.copyFileSync(src, dest)`

Synchronous file copy.

## `extended-fs.copyDir(src, dest, callback)`

Asynchronous recursive directory copy. Copies all files found at the `src` directory, removing `dest` before writing. No arguments other than a possible error are given to the callback.

## `extended-fs.copyDirSync(src, dest, callback)`

Synchronous recursive directory copy.

## `extended-fs.mkdirp(dir, mode, callback)`

See [mkdirp](https://github.com/substack/node-mkdirp#mkdirpdir-mode-cb).

## `extended-fs.mkdirpSync(dir, mode)`

See [mkdirp.sync](https://github.com/substack/node-mkdirp#mkdirpsyncdir-mode).