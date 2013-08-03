"use strict";
var ejs = require('./ejs/ejs.js');
var fs = require('fs');

var cache = {};
// cache = {path: <cache_entry>, ...}
//
// cache_entry = {
//   path:<str>, template:<fun>, stat:{...}, deps:[{path:<str>, stat:{...}}, ...]
// }
//
// options: {
//   basedir:     '.',
//   autoreload:  false,
//   debug:       false,
// }

// pstat( [{path:<str>, stat:{...}}, ...], callback(err, entries, stats) )
function pstat(entries, callback) {
  var countdown = entries.length;
  var stats = new Array(entries.length);
  var errors = [];
  entries.forEach(function (entry, i) {
    fs.stat(entry.path, function (err, st) {
      stats[i] = st;
      if (err) countdown = 1;
      if (--countdown === 0) {
        callback(err, entries, stats);
      }
    });
  });
}

function load_from_file_sync(path, options, stat) { // -> template
  if (options.debug) {
    console.log('[' + module.id + '] loading', path);
  }

  if (!stat) stat = fs.statSync(path);
  var s = fs.readFileSync(path, {encoding:'utf8'});
  var entry = {template: ejs.compile(s, {filename: path, cache: false})};
  entry.deps = entry.template.included_paths.map(function (path) { return {path:path}; });
  entry.path = path;
  cache[path] = entry;

  if (options && options.autoreload) {
    entry.stat = {mtime: stat.mtime};
    entry.deps.forEach(function (dep) { dep.stat = {mtime: fs.statSync(dep.path).mtime}; });
  }

  return entry.template;
}


function load_from_file(path, options, callback, stat) {
  try {
    callback(null, load_from_file_sync(path, options, stat));
  } catch (err) {
    callback(err);
  }
}


// callback(err, template_fun)
function from_file(filename, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  if (options === null || typeof options !== 'object') options = {basedir:'.'};
  var path = options.basedir + '/' + filename;
  var entry = cache[path];

  if (entry === undefined) {
    return load_from_file(path, options, callback);
  }

  if (options && options.autoreload) {
    pstat([entry].concat(entry.deps), function (err, entries, stats) {
      if (err) {
        callback(err);
      } else if (entries.some(function (entry, i) { return stats[i].mtime > entry.stat.mtime; })) {
        load_from_file(path, options, callback, stats[0]);
      } else {
        callback(null, entry.template);
      }
    });
  } else {
    callback(null, entry.template);
  }
}
exports.from_file = from_file;


function mk_writeTemplate(options) {
  // writeTemplate(filename, [locals], [callback(err)])
  return function writeTemplate(filename, locals, callback) {
    if (typeof locals === 'function') {
      callback = locals;
      locals = undefined;
    }
    from_file(filename, options, (function (err, template) {
      var body;
      if (err) {
        if (typeof callback === 'function') return callback(err);
        this.status = 500;
        body = String(err.trace || err);
      } else {
        body = template(locals);
      }
      this.write(body, 'utf8');
      if (typeof callback === 'function') callback();
    }).bind(this));
  };
}


function mk_endTemplate(options) {
  // endTemplate(filename, [locals], [callback(err)])
  return function endTemplate(filename, locals, callback) {
    if (typeof locals === 'function') {
      callback = locals;
      locals = undefined;
    }
    from_file(filename, options, (function (err, template) {
      var body;
      if (err) {
        if (typeof callback === 'function') {
          callback(err);
        } else {
          this.status = 500;
          body = String(err.trace || err);
        }
      } else {
        body = template(locals);
      }
      this.setHeader('Content-Length', String(body.length));
      this.end(body, 'utf8');
      if (typeof callback === 'function') callback();
    }).bind(this));
  };
}

// Connect-style middleware API that adds `writeTemplate` and 'endTemplate' properties to
// response objects
exports.middleware = function middleware(options) {
  return function (req, res, next) {
    res.writeTemplate = mk_writeTemplate(options);
    res.endTemplate = mk_endTemplate(options);
    next();
  };
};

// Patch http.ServerResponse prototype
// exports.patch = function patch(options) {
//   var res = require('http').ServerResponse.prototype;
//   res.writeTemplate = mk_writeTemplate(options);
//   res.endTemplate = mk_endTemplate(options);
// };
