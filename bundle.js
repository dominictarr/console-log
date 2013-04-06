(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",Function(['require','module','exports','__dirname','__filename','process','global'],"function filter (xs, fn) {\n    var res = [];\n    for (var i = 0; i < xs.length; i++) {\n        if (fn(xs[i], i, xs)) res.push(xs[i]);\n    }\n    return res;\n}\n\n// resolves . and .. elements in a path array with directory names there\n// must be no slashes, empty elements, or device names (c:\\) in the array\n// (so also no leading and trailing slashes - it does not distinguish\n// relative and absolute paths)\nfunction normalizeArray(parts, allowAboveRoot) {\n  // if the path tries to go above the root, `up` ends up > 0\n  var up = 0;\n  for (var i = parts.length; i >= 0; i--) {\n    var last = parts[i];\n    if (last == '.') {\n      parts.splice(i, 1);\n    } else if (last === '..') {\n      parts.splice(i, 1);\n      up++;\n    } else if (up) {\n      parts.splice(i, 1);\n      up--;\n    }\n  }\n\n  // if the path is allowed to go above the root, restore leading ..s\n  if (allowAboveRoot) {\n    for (; up--; up) {\n      parts.unshift('..');\n    }\n  }\n\n  return parts;\n}\n\n// Regex to split a filename into [*, dir, basename, ext]\n// posix version\nvar splitPathRe = /^(.+\\/(?!$)|\\/)?((?:.+?)?(\\.[^.]*)?)$/;\n\n// path.resolve([from ...], to)\n// posix version\nexports.resolve = function() {\nvar resolvedPath = '',\n    resolvedAbsolute = false;\n\nfor (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {\n  var path = (i >= 0)\n      ? arguments[i]\n      : process.cwd();\n\n  // Skip empty and invalid entries\n  if (typeof path !== 'string' || !path) {\n    continue;\n  }\n\n  resolvedPath = path + '/' + resolvedPath;\n  resolvedAbsolute = path.charAt(0) === '/';\n}\n\n// At this point the path should be resolved to a full absolute path, but\n// handle relative paths to be safe (might happen when process.cwd() fails)\n\n// Normalize the path\nresolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {\n    return !!p;\n  }), !resolvedAbsolute).join('/');\n\n  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';\n};\n\n// path.normalize(path)\n// posix version\nexports.normalize = function(path) {\nvar isAbsolute = path.charAt(0) === '/',\n    trailingSlash = path.slice(-1) === '/';\n\n// Normalize the path\npath = normalizeArray(filter(path.split('/'), function(p) {\n    return !!p;\n  }), !isAbsolute).join('/');\n\n  if (!path && !isAbsolute) {\n    path = '.';\n  }\n  if (path && trailingSlash) {\n    path += '/';\n  }\n  \n  return (isAbsolute ? '/' : '') + path;\n};\n\n\n// posix version\nexports.join = function() {\n  var paths = Array.prototype.slice.call(arguments, 0);\n  return exports.normalize(filter(paths, function(p, index) {\n    return p && typeof p === 'string';\n  }).join('/'));\n};\n\n\nexports.dirname = function(path) {\n  var dir = splitPathRe.exec(path)[1] || '';\n  var isWindows = false;\n  if (!dir) {\n    // No dirname\n    return '.';\n  } else if (dir.length === 1 ||\n      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {\n    // It is just a slash or a drive letter with a slash\n    return dir;\n  } else {\n    // It is a full dirname, strip trailing slash\n    return dir.substring(0, dir.length - 1);\n  }\n};\n\n\nexports.basename = function(path, ext) {\n  var f = splitPathRe.exec(path)[2] || '';\n  // TODO: make this comparison case-insensitive on windows?\n  if (ext && f.substr(-1 * ext.length) === ext) {\n    f = f.substr(0, f.length - ext.length);\n  }\n  return f;\n};\n\n\nexports.extname = function(path) {\n  return splitPathRe.exec(path)[3] || '';\n};\n\n//@ sourceURL=path"
));

require.define("__browserify_process",Function(['require','module','exports','__dirname','__filename','process','global'],"var process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n        && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n        && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'browserify-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('browserify-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    if (name === 'evals') return (require)('vm')\n    else throw new Error('No such module. (Possibly not yet loaded)')\n};\n\n(function () {\n    var cwd = '/';\n    var path;\n    process.cwd = function () { return cwd };\n    process.chdir = function (dir) {\n        if (!path) path = require('path');\n        cwd = path.resolve(dir, cwd);\n    };\n})();\n\n//@ sourceURL=__browserify_process"
));

require.define("/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/package.json"
));

require.define("/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var widget = require('./widget')\nvar o      = require('observable')\nvar h      = require('hyperscript')\n\n//create console.log if does not exist, i.e. IE.\nif('undefined' === typeof console) {\n  globals.console = {}\n  console.log = function () {}\n  console.error = function () {}\n}\n\nvar emitter = widget({style: {\n  height: '400px',\n  width: '200px',\n  'border-bottom': '1px dotted black'\n}})\n\nfunction wrap (name) {\n  var log = console[name]\n  console[name] = function () {\n    var args = [].slice.call(arguments)\n    emitter.write(args)\n    log.apply(console, args)\n  }\n}\n\nwrap('log')\nwrap('error')\n\nwindow.addEventListener('error', function (err) {\n  emitter.write([err.stack])\n})\n\ndocument.body.appendChild(\n  h('div',\n    {style: {\n      background: 'white',\n      border: '1px solid black',\n      position: 'fixed',\n      right: '20px',\n      bottom: '20px'\n    }},\n    emitter.element,\n    h('div',\n      o.boolean(emitter.show, '>', '<'),\n      {onclick: function () {\n        emitter.show(!emitter.show())\n      }},\n      {style: {\n        'margin': '10px',\n        'min-width': '20px',\n        'min-height': '20px',\n        'text-align': 'center'\n      }}\n    )\n  )\n)\n\nemitter.show(false)\n\nmodule.exports = emitter\n\n//@ sourceURL=/index.js"
));

require.define("/widget.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var EventEmitter = require('events').EventEmitter\nvar h = require('hyperscript')\nvar o = require('observable')\n\nvar log = console.log\nmodule.exports = function (opts) {\n  opts = opts || {}\n  //a writable stream does not need pipe.\n  //so inherit from EventEmitter is okay.\n  var emitter = new EventEmitter()\n  var follow = true\n\n  opts.max = 10000\n  opts.margin = opts.margin || 30\n  opts.style = opts.style || {height: '100%', width: '50%'}\n  opts.template = opts.template || function (args) {\n    return h('pre', args.map(function (e, i) {\n      //stringify the first item, like regular console.log\n      if(!i) return String(e)\n      try {\n        return JSON.stringify(e, false, 2)\n      } catch (e) {\n        return String(e)\n      }\n    }).join(' '))\n  }\n\n\n  emitter.show = o()\n\n  var inner  = h('div')\n  var logger = h('div', {style: opts.style},\n    {style: {\n      overflow: 'scroll',\n      display: o.boolean(emitter.show, 'block', 'none')\n    }},\n    inner)\n\n  emitter.follow = function () {\n    var el = inner.lastElementChild\n    el && el.scrollIntoViewIfNeeded()\n    follow = true\n  }\n\n  emitter.show(function (v) {\n    if(v && follow)\n      emitter.follow()\n  })\n\n  emitter.show(true)\n\n  emitter.end = function () {}\n  emitter.writable = true\n\n  emitter.log =\n  emitter.write = function (data) {\n    var message = opts.template(data)\n\n    var bottom = inner.getBoundingClientRect().bottom\n    var size   = logger.getBoundingClientRect().bottom\n\n    follow = bottom < size + opts.margin\n\n    inner.appendChild(message)\n\n    //if there is too much data in the log, remove some stuff.\n\n    if(follow && emitter.show()) {\n      while(inner.clientHeight > opts.max && inner.children.length) {\n        inner.removeChild(inner.firstChild)\n      }\n      message.scrollIntoViewIfNeeded()\n    }\n    return true\n  }\n\n  emitter.element = logger\n  return emitter\n}\n\n\n//@ sourceURL=/widget.js"
));

require.define("events",Function(['require','module','exports','__dirname','__filename','process','global'],"if (!process.EventEmitter) process.EventEmitter = function () {};\n\nvar EventEmitter = exports.EventEmitter = process.EventEmitter;\nvar isArray = typeof Array.isArray === 'function'\n    ? Array.isArray\n    : function (xs) {\n        return Object.prototype.toString.call(xs) === '[object Array]'\n    }\n;\nfunction indexOf (xs, x) {\n    if (xs.indexOf) return xs.indexOf(x);\n    for (var i = 0; i < xs.length; i++) {\n        if (x === xs[i]) return i;\n    }\n    return -1;\n}\n\n// By default EventEmitters will print a warning if more than\n// 10 listeners are added to it. This is a useful default which\n// helps finding memory leaks.\n//\n// Obviously not all Emitters should be limited to 10. This function allows\n// that to be increased. Set to zero for unlimited.\nvar defaultMaxListeners = 10;\nEventEmitter.prototype.setMaxListeners = function(n) {\n  if (!this._events) this._events = {};\n  this._events.maxListeners = n;\n};\n\n\nEventEmitter.prototype.emit = function(type) {\n  // If there is no 'error' event listener then throw.\n  if (type === 'error') {\n    if (!this._events || !this._events.error ||\n        (isArray(this._events.error) && !this._events.error.length))\n    {\n      if (arguments[1] instanceof Error) {\n        throw arguments[1]; // Unhandled 'error' event\n      } else {\n        throw new Error(\"Uncaught, unspecified 'error' event.\");\n      }\n      return false;\n    }\n  }\n\n  if (!this._events) return false;\n  var handler = this._events[type];\n  if (!handler) return false;\n\n  if (typeof handler == 'function') {\n    switch (arguments.length) {\n      // fast cases\n      case 1:\n        handler.call(this);\n        break;\n      case 2:\n        handler.call(this, arguments[1]);\n        break;\n      case 3:\n        handler.call(this, arguments[1], arguments[2]);\n        break;\n      // slower\n      default:\n        var args = Array.prototype.slice.call(arguments, 1);\n        handler.apply(this, args);\n    }\n    return true;\n\n  } else if (isArray(handler)) {\n    var args = Array.prototype.slice.call(arguments, 1);\n\n    var listeners = handler.slice();\n    for (var i = 0, l = listeners.length; i < l; i++) {\n      listeners[i].apply(this, args);\n    }\n    return true;\n\n  } else {\n    return false;\n  }\n};\n\n// EventEmitter is defined in src/node_events.cc\n// EventEmitter.prototype.emit() is also defined there.\nEventEmitter.prototype.addListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('addListener only takes instances of Function');\n  }\n\n  if (!this._events) this._events = {};\n\n  // To avoid recursion in the case that type == \"newListeners\"! Before\n  // adding it to the listeners, first emit \"newListeners\".\n  this.emit('newListener', type, listener);\n\n  if (!this._events[type]) {\n    // Optimize the case of one listener. Don't need the extra array object.\n    this._events[type] = listener;\n  } else if (isArray(this._events[type])) {\n\n    // Check for listener leak\n    if (!this._events[type].warned) {\n      var m;\n      if (this._events.maxListeners !== undefined) {\n        m = this._events.maxListeners;\n      } else {\n        m = defaultMaxListeners;\n      }\n\n      if (m && m > 0 && this._events[type].length > m) {\n        this._events[type].warned = true;\n        console.error('(node) warning: possible EventEmitter memory ' +\n                      'leak detected. %d listeners added. ' +\n                      'Use emitter.setMaxListeners() to increase limit.',\n                      this._events[type].length);\n        console.trace();\n      }\n    }\n\n    // If we've already got an array, just append.\n    this._events[type].push(listener);\n  } else {\n    // Adding the second element, need to change to array.\n    this._events[type] = [this._events[type], listener];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.on = EventEmitter.prototype.addListener;\n\nEventEmitter.prototype.once = function(type, listener) {\n  var self = this;\n  self.on(type, function g() {\n    self.removeListener(type, g);\n    listener.apply(this, arguments);\n  });\n\n  return this;\n};\n\nEventEmitter.prototype.removeListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('removeListener only takes instances of Function');\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (!this._events || !this._events[type]) return this;\n\n  var list = this._events[type];\n\n  if (isArray(list)) {\n    var i = indexOf(list, listener);\n    if (i < 0) return this;\n    list.splice(i, 1);\n    if (list.length == 0)\n      delete this._events[type];\n  } else if (this._events[type] === listener) {\n    delete this._events[type];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.removeAllListeners = function(type) {\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (type && this._events && this._events[type]) this._events[type] = null;\n  return this;\n};\n\nEventEmitter.prototype.listeners = function(type) {\n  if (!this._events) this._events = {};\n  if (!this._events[type]) this._events[type] = [];\n  if (!isArray(this._events[type])) {\n    this._events[type] = [this._events[type]];\n  }\n  return this._events[type];\n};\n\n//@ sourceURL=events"
));

require.define("/node_modules/hyperscript/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/node_modules/hyperscript/package.json"
));

require.define("/node_modules/hyperscript/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var split = require('browser-split')\nvar ClassList = require('class-list')\nvar DataSet = require('data-set')\n\nmodule.exports = h\n\nfunction h() {\n  var args = [].slice.call(arguments), e = null\n  function item (l) {\n    var r\n    function parseClass (string) {\n      var m = split(string, /([\\.#]?[a-zA-Z0-9_-]+)/)\n      forEach(m, function (v) {\n        var s = v.substring(1,v.length)\n        if(!v) return\n        if(!e)\n          e = document.createElement(v)\n        else if (v[0] === '.')\n          ClassList(e).add(s)\n        else if (v[0] === '#')\n          e.setAttribute('id', s)\n      })\n    }\n\n    if(l == null)\n      ;\n    else if('string' === typeof l) {\n      if(!e)\n        parseClass(l)\n      else\n        e.appendChild(r = document.createTextNode(l))\n    }\n    else if('number' === typeof l\n      || 'boolean' === typeof l\n      || l instanceof Date\n      || l instanceof RegExp ) {\n        e.appendChild(r = document.createTextNode(l.toString()))\n    }\n    //there might be a better way to handle this...\n    else if (isArray(l))\n      forEach(l, item)\n    else if(isNode(l))\n      e.appendChild(r = l)\n    else if(l instanceof Text)\n      e.appendChild(r = l)\n    else if ('object' === typeof l) {\n      for (var k in l) {\n        if('function' === typeof l[k]) {\n          if(/^on\\w+/.test(k)) {\n            e.addEventListener\n              ? e.addEventListener(k.substring(2), l[k])\n              : e.attachEvent(k, l[k])\n          } else {\n            e[k] = l[k]()\n            l[k](function (v) {\n              e[k] = v\n            })\n          }\n        }\n        else if(k === 'style') {\n          for (var s in l[k]) (function(s, v) {\n            if('function' === typeof v) {\n              e.style.setProperty(s, v())\n              v(function (val) {\n                e.style.setProperty(s, val)\n              })\n            } else\n              e.style.setProperty(s, l[k][s])\n          })(s, l[k][s])\n        } else if (k.substr(0, 5) === \"data-\") {\n          DataSet(e)[k.substr(5)] = l[k]\n        } else {\n          e[k] = l[k]\n        }\n      }\n    } else if ('function' === typeof l) {\n      //assume it's an observable!\n      var v = l()\n      e.appendChild(r = isNode(v) ? v : document.createTextNode(v))\n\n      l(function (v) {\n        if(isNode(v) && r.parentElement)\n          r.parentElement.replaceChild(v, r), r = v\n        else\n          r.textContent = v\n      })\n\n    }\n\n    return r\n  }\n  while(args.length)\n    item(args.shift())\n\n  return e\n}\n\nfunction isNode (el) {\n  return el.nodeName && el.nodeType\n}\n\nfunction forEach (arr, fn) {\n  if (arr.forEach) return arr.forEach(fn)\n  for (var i = 0; i < arr.length; i++) fn(arr[i], i)\n}\n\nfunction isArray (arr) {\n  return Object.prototype.toString.call(arr) == '[object Array]'\n}\n\n//@ sourceURL=/node_modules/hyperscript/index.js"
));

require.define("/node_modules/hyperscript/node_modules/browser-split/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"index.js\"}\n//@ sourceURL=/node_modules/hyperscript/node_modules/browser-split/package.json"
));

require.define("/node_modules/hyperscript/node_modules/browser-split/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*!\n * Cross-Browser Split 1.1.1\n * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>\n * Available under the MIT License\n * ECMAScript compliant, uniform cross-browser split method\n */\n\n/**\n * Splits a string into an array of strings using a regex or string separator. Matches of the\n * separator are not included in the result array. However, if `separator` is a regex that contains\n * capturing groups, backreferences are spliced into the result each time `separator` is matched.\n * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably\n * cross-browser.\n * @param {String} str String to split.\n * @param {RegExp|String} separator Regex or string to use for separating the string.\n * @param {Number} [limit] Maximum number of items to include in the result array.\n * @returns {Array} Array of substrings.\n * @example\n *\n * // Basic use\n * split('a b c d', ' ');\n * // -> ['a', 'b', 'c', 'd']\n *\n * // With limit\n * split('a b c d', ' ', 2);\n * // -> ['a', 'b']\n *\n * // Backreferences in result array\n * split('..word1 word2..', /([a-z]+)(\\d+)/i);\n * // -> ['..', 'word', '1', ' ', 'word', '2', '..']\n */\nmodule.exports = (function split(undef) {\n\n  var nativeSplit = String.prototype.split,\n    compliantExecNpcg = /()??/.exec(\"\")[1] === undef,\n    // NPCG: nonparticipating capturing group\n    self;\n\n  self = function(str, separator, limit) {\n    // If `separator` is not a regex, use `nativeSplit`\n    if (Object.prototype.toString.call(separator) !== \"[object RegExp]\") {\n      return nativeSplit.call(str, separator, limit);\n    }\n    var output = [],\n      flags = (separator.ignoreCase ? \"i\" : \"\") + (separator.multiline ? \"m\" : \"\") + (separator.extended ? \"x\" : \"\") + // Proposed for ES6\n      (separator.sticky ? \"y\" : \"\"),\n      // Firefox 3+\n      lastLastIndex = 0,\n      // Make `global` and avoid `lastIndex` issues by working with a copy\n      separator = new RegExp(separator.source, flags + \"g\"),\n      separator2, match, lastIndex, lastLength;\n    str += \"\"; // Type-convert\n    if (!compliantExecNpcg) {\n      // Doesn't need flags gy, but they don't hurt\n      separator2 = new RegExp(\"^\" + separator.source + \"$(?!\\\\s)\", flags);\n    }\n    /* Values for `limit`, per the spec:\n     * If undefined: 4294967295 // Math.pow(2, 32) - 1\n     * If 0, Infinity, or NaN: 0\n     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;\n     * If negative number: 4294967296 - Math.floor(Math.abs(limit))\n     * If other: Type-convert, then use the above rules\n     */\n    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1\n    limit >>> 0; // ToUint32(limit)\n    while (match = separator.exec(str)) {\n      // `separator.lastIndex` is not reliable cross-browser\n      lastIndex = match.index + match[0].length;\n      if (lastIndex > lastLastIndex) {\n        output.push(str.slice(lastLastIndex, match.index));\n        // Fix browsers whose `exec` methods don't consistently return `undefined` for\n        // nonparticipating capturing groups\n        if (!compliantExecNpcg && match.length > 1) {\n          match[0].replace(separator2, function() {\n            for (var i = 1; i < arguments.length - 2; i++) {\n              if (arguments[i] === undef) {\n                match[i] = undef;\n              }\n            }\n          });\n        }\n        if (match.length > 1 && match.index < str.length) {\n          Array.prototype.push.apply(output, match.slice(1));\n        }\n        lastLength = match[0].length;\n        lastLastIndex = lastIndex;\n        if (output.length >= limit) {\n          break;\n        }\n      }\n      if (separator.lastIndex === match.index) {\n        separator.lastIndex++; // Avoid an infinite loop\n      }\n    }\n    if (lastLastIndex === str.length) {\n      if (lastLength || !separator.test(\"\")) {\n        output.push(\"\");\n      }\n    } else {\n      output.push(str.slice(lastLastIndex));\n    }\n    return output.length > limit ? output.slice(0, limit) : output;\n  };\n\n  return self;\n})();\n\n//@ sourceURL=/node_modules/hyperscript/node_modules/browser-split/index.js"
));

require.define("/node_modules/hyperscript/node_modules/class-list/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"index\"}\n//@ sourceURL=/node_modules/hyperscript/node_modules/class-list/package.json"
));

require.define("/node_modules/hyperscript/node_modules/class-list/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"// contains, add, remove, toggle\n\nmodule.exports = ClassList\n\nfunction ClassList(elem) {\n    var cl = elem.classList\n\n    if (cl) {\n        return cl\n    }\n\n    var classList = {\n        add: add\n        , remove: remove\n        , contains: contains\n        , toggle: toggle\n        , toString: $toString\n        , length: 0\n        , item: item\n    }\n\n    return classList\n\n    function add(token) {\n        var list = getTokens()\n        if (list.indexOf(token) > -1) {\n            return\n        }\n        list.push(token)\n        setTokens(list)\n    }\n\n    function remove(token) {\n        var list = getTokens()\n            , index = list.indexOf(token)\n\n        if (index === -1) {\n            return\n        }\n\n        list.splice(index, 1)\n        setTokens(list)\n    }\n\n    function contains(token) {\n        return getTokens().indexOf(token) > -1\n    }\n\n    function toggle(token) {\n        if (contains(token)) {\n            remove(token)\n            return false\n        } else {\n            add(token)\n            return true\n        }\n    }\n\n    function $toString() {\n        return elem.className\n    }\n\n    function item(index) {\n        var tokens = getTokens()\n        return tokens[index] || null\n    }\n\n    function getTokens() {\n        var className = elem.className\n\n        return filter(className.split(\" \"), isTruthy)\n    }\n\n    function setTokens(list) {\n        var length = list.length\n\n        elem.className = list.join(\" \")\n        classList.length = length\n\n        for (var i = 0; i < list.length; i++) {\n            classList[i] = list[i]\n        }\n\n        delete list[length]\n    }\n}\n\nfunction filter (arr, fn) {\n    var ret = []\n    for (var i = 0; i < arr.length; i++) {\n        if (fn(arr[i])) ret.push(arr[i])\n    }\n    return ret\n}\n\nfunction isTruthy(value) {\n    return !!value\n}\n\n//@ sourceURL=/node_modules/hyperscript/node_modules/class-list/index.js"
));

require.define("/node_modules/hyperscript/node_modules/data-set/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"index\"}\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/package.json"
));

require.define("/node_modules/hyperscript/node_modules/data-set/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var Weakmap = require(\"weakmap\")\nvar Individual = require(\"individual\")\n\nvar datasetMap = Individual(\"__DATA_SET_WEAKMAP\", Weakmap())\n\nmodule.exports = DataSet\n\nfunction DataSet(elem) {\n    if (elem.dataset) {\n        return elem.dataset\n    }\n\n    var hash = datasetMap.get(elem)\n\n    if (!hash) {\n        hash = createHash(elem)\n        datasetMap.set(elem, hash)\n    }\n\n    return hash\n}\n\nfunction createHash(elem) {\n    var attributes = elem.attributes\n    var hash = {}\n\n    if (attributes === null || attributes === undefined) {\n        return hash\n    }\n\n    for (var i = 0; i < attributes.length; i++) {\n        var attr = attributes[i]\n\n        if (attr.name.substr(0,5) !== \"data-\") {\n            continue\n        }\n\n        hash[attr.name.substr(5)] = attr.value\n    }\n\n    return hash\n}\n\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/index.js"
));

require.define("/node_modules/hyperscript/node_modules/data-set/node_modules/weakmap/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"weakmap.js\"}\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/node_modules/weakmap/package.json"
));

require.define("/node_modules/hyperscript/node_modules/data-set/node_modules/weakmap/weakmap.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/* (The MIT License)\r\n *\r\n * Copyright (c) 2012 Brandon Benvie <http://bbenvie.com>\r\n *\r\n * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and\r\n * associated documentation files (the 'Software'), to deal in the Software without restriction,\r\n * including without limitation the rights to use, copy, modify, merge, publish, distribute,\r\n * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is\r\n * furnished to do so, subject to the following conditions:\r\n *\r\n * The above copyright notice and this permission notice shall be included with all copies or\r\n * substantial portions of the Software.\r\n *\r\n * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING\r\n * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\r\n * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY  CLAIM,\r\n * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\r\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\r\n */\r\n\r\n// Original WeakMap implementation by Gozala @ https://gist.github.com/1269991\r\n// Updated and bugfixed by Raynos @ https://gist.github.com/1638059\r\n// Expanded by Benvie @ https://github.com/Benvie/harmony-collections\r\n\r\nvoid function(global, undefined_, undefined){\r\n  var getProps = Object.getOwnPropertyNames,\r\n      defProp  = Object.defineProperty,\r\n      toSource = Function.prototype.toString,\r\n      create   = Object.create,\r\n      hasOwn   = Object.prototype.hasOwnProperty,\r\n      funcName = /^\\n?function\\s?(\\w*)?_?\\(/;\r\n\r\n\r\n  function define(object, key, value){\r\n    if (typeof key === 'function') {\r\n      value = key;\r\n      key = nameOf(value).replace(/_$/, '');\r\n    }\r\n    return defProp(object, key, { configurable: true, writable: true, value: value });\r\n  }\r\n\r\n  function nameOf(func){\r\n    return typeof func !== 'function'\r\n          ? '' : 'name' in func\r\n          ? func.name : toSource.call(func).match(funcName)[1];\r\n  }\r\n\r\n  // ############\r\n  // ### Data ###\r\n  // ############\r\n\r\n  var Data = (function(){\r\n    var dataDesc = { value: { writable: true, value: undefined } },\r\n        datalock = 'return function(k){if(k===s)return l}',\r\n        uids     = create(null),\r\n\r\n        createUID = function(){\r\n          var key = Math.random().toString(36).slice(2);\r\n          return key in uids ? createUID() : uids[key] = key;\r\n        },\r\n\r\n        globalID = createUID(),\r\n\r\n        storage = function(obj){\r\n          if (hasOwn.call(obj, globalID))\r\n            return obj[globalID];\r\n\r\n          if (!Object.isExtensible(obj))\r\n            throw new TypeError(\"Object must be extensible\");\r\n\r\n          var store = create(null);\r\n          defProp(obj, globalID, { value: store });\r\n          return store;\r\n        };\r\n\r\n    // common per-object storage area made visible by patching getOwnPropertyNames'\r\n    define(Object, function getOwnPropertyNames(obj){\r\n      var props = getProps(obj);\r\n      if (hasOwn.call(obj, globalID))\r\n        props.splice(props.indexOf(globalID), 1);\r\n      return props;\r\n    });\r\n\r\n    function Data(){\r\n      var puid = createUID(),\r\n          secret = {};\r\n\r\n      this.unlock = function(obj){\r\n        var store = storage(obj);\r\n        if (hasOwn.call(store, puid))\r\n          return store[puid](secret);\r\n\r\n        var data = create(null, dataDesc);\r\n        defProp(store, puid, {\r\n          value: new Function('s', 'l', datalock)(secret, data)\r\n        });\r\n        return data;\r\n      }\r\n    }\r\n\r\n    define(Data.prototype, function get(o){ return this.unlock(o).value });\r\n    define(Data.prototype, function set(o, v){ this.unlock(o).value = v });\r\n\r\n    return Data;\r\n  }());\r\n\r\n\r\n  var WM = (function(data){\r\n    var validate = function(key){\r\n      if (key == null || typeof key !== 'object' && typeof key !== 'function')\r\n        throw new TypeError(\"Invalid WeakMap key\");\r\n    }\r\n\r\n    var wrap = function(collection, value){\r\n      var store = data.unlock(collection);\r\n      if (store.value)\r\n        throw new TypeError(\"Object is already a WeakMap\");\r\n      store.value = value;\r\n    }\r\n\r\n    var unwrap = function(collection){\r\n      var storage = data.unlock(collection).value;\r\n      if (!storage)\r\n        throw new TypeError(\"WeakMap is not generic\");\r\n      return storage;\r\n    }\r\n\r\n    var initialize = function(weakmap, iterable){\r\n      if (iterable !== null && typeof iterable === 'object' && typeof iterable.forEach === 'function') {\r\n        iterable.forEach(function(item, i){\r\n          if (item instanceof Array && item.length === 2)\r\n            set.call(weakmap, iterable[i][0], iterable[i][1]);\r\n        });\r\n      }\r\n    }\r\n\r\n\r\n    function WeakMap(iterable){\r\n      if (this === global || this == null || this === WeakMap.prototype)\r\n        return new WeakMap(iterable);\r\n\r\n      wrap(this, new Data);\r\n      initialize(this, iterable);\r\n    }\r\n\r\n    function get(key){\r\n      validate(key);\r\n      var value = unwrap(this).get(key);\r\n      return value === undefined_ ? undefined : value;\r\n    }\r\n\r\n    function set(key, value){\r\n      validate(key);\r\n      // store a token for explicit undefined so that \"has\" works correctly\r\n      unwrap(this).set(key, value === undefined ? undefined_ : value);\r\n    }\r\n\r\n    function has(key){\r\n      validate(key);\r\n      return unwrap(this).get(key) !== undefined;\r\n    }\r\n\r\n    function delete_(key){\r\n      validate(key);\r\n      var data = unwrap(this),\r\n          had = data.get(key) !== undefined;\r\n      data.set(key, undefined);\r\n      return had;\r\n    }\r\n\r\n    function toString(){\r\n      unwrap(this);\r\n      return '[object WeakMap]';\r\n    }\r\n\r\n    try {\r\n      var src = ('return '+delete_).replace('e_', '\\\\u0065'),\r\n          del = new Function('unwrap', 'validate', src)(unwrap, validate);\r\n    } catch (e) {\r\n      var del = delete_;\r\n    }\r\n\r\n    var src = (''+Object).split('Object');\r\n    var stringifier = function toString(){\r\n      return src[0] + nameOf(this) + src[1];\r\n    };\r\n\r\n    define(stringifier, stringifier);\r\n\r\n    var prep = { __proto__: [] } instanceof Array\r\n      ? function(f){ f.__proto__ = stringifier }\r\n      : function(f){ define(f, stringifier) };\r\n\r\n    prep(WeakMap);\r\n\r\n    [toString, get, set, has, del].forEach(function(method){\r\n      define(WeakMap.prototype, method);\r\n      prep(method);\r\n    });\r\n\r\n    return WeakMap;\r\n  }(new Data));\r\n\r\n  var defaultCreator = Object.create\r\n    ? function(){ return Object.create(null) }\r\n    : function(){ return {} };\r\n\r\n  function createStorage(creator){\r\n    var weakmap = new WM;\r\n    creator || (creator = defaultCreator);\r\n\r\n    function storage(object, value){\r\n      if (value || arguments.length === 2) {\r\n        weakmap.set(object, value);\r\n      } else {\r\n        value = weakmap.get(object);\r\n        if (value === undefined) {\r\n          value = creator(object);\r\n          weakmap.set(object, value);\r\n        }\r\n      }\r\n      return value;\r\n    }\r\n\r\n    return storage;\r\n  }\r\n\r\n\r\n  if (typeof module !== 'undefined') {\r\n    module.exports = WM;\r\n  } else if (typeof exports !== 'undefined') {\r\n    exports.WeakMap = WM;\r\n  } else if (!('WeakMap' in global)) {\r\n    global.WeakMap = WM;\r\n  }\r\n\r\n  WM.createStorage = createStorage;\r\n  if (global.WeakMap)\r\n    global.WeakMap.createStorage = createStorage;\r\n}((0, eval)('this'));\r\n\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/node_modules/weakmap/weakmap.js"
));

require.define("/node_modules/hyperscript/node_modules/data-set/node_modules/individual/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"index\"}\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/node_modules/individual/package.json"
));

require.define("/node_modules/hyperscript/node_modules/data-set/node_modules/individual/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var root = require(\"global\")\n\nmodule.exports = Individual\n\nfunction Individual(key, value) {\n    if (root[key]) {\n        return root[key]\n    }\n\n    Object.defineProperty(root, key, {\n        value: value\n        , configurable: true\n    })\n\n    return value\n}\n\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/node_modules/individual/index.js"
));

require.define("/node_modules/hyperscript/node_modules/data-set/node_modules/individual/node_modules/global/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"index\"}\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/node_modules/individual/node_modules/global/package.json"
));

require.define("/node_modules/hyperscript/node_modules/data-set/node_modules/individual/node_modules/global/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*global window, global*/\nif (typeof global !== \"undefined\") {\n    module.exports = global\n} else if (typeof window !== \"undefined\") {\n    module.exports = window\n}\n\n//@ sourceURL=/node_modules/hyperscript/node_modules/data-set/node_modules/individual/node_modules/global/index.js"
));

require.define("/node_modules/observable/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/node_modules/observable/package.json"
));

require.define("/node_modules/observable/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],";(function () {\n\n// bind a to b -- One Way Binding\nfunction bind1(a, b) {\n  a(b()); b(a)\n}\n//bind a to b and b to a -- Two Way Binding\nfunction bind2(a, b) {\n  b(a()); a(b); b(a);\n}\n\n//---util-funtions------\n\n//check if this call is a get.\nfunction isGet(val) {\n  return undefined === val\n}\n\n//check if this call is a set, else, it's a listen\nfunction isSet(val) {\n  return 'function' !== typeof val\n}\n\n//trigger all listeners\nfunction all(ary, val) {\n  for(var k in ary)\n    ary[k](val)\n}\n\n//remove a listener\nfunction remove(ary, item) {\n  delete ary[ary.indexOf(item)]\n}\n\n//register a listener\nfunction on(emitter, event, listener) {\n  (emitter.on || emitter.addEventListener)\n    .call(emitter, event, listener, false)\n}\n\nfunction off(emitter, event, listener) {\n  (emitter.removeListener || emitter.removeEventListener || emitter.off)\n    .call(emitter, event, listener, false)\n}\n\n//An observable that stores a value.\n\nfunction value () {\n  var _val, listeners = []\n  return function (val) {\n    return (\n      isGet(val) ? _val\n    : isSet(val) ? all(listeners, _val = val)\n    : (listeners.push(val), function () {\n        remove(listeners, val)\n      })\n  )}}\n  //^ if written in this style, always ends )}}\n\n/*\n##property\nobserve a property of an object, works with scuttlebutt.\ncould change this to work with backbone Model - but it would become ugly.\n*/\n\nfunction property (model, key) {\n  return function (val) {\n    return (\n      isGet(val) ? model.get(key) :\n      isSet(val) ? model.set(key, val) :\n      (on(model, 'change:'+key, val), function () {\n        off(model, 'change:'+key, val)\n      })\n    )}}\n\n/*\nnote the use of the elvis operator `?:` in chained else-if formation,\nand also the comma operator `,` which evaluates each part and then\nreturns the last value.\n\nonly 8 lines! that isn't much for what this baby can do!\n*/\n\nfunction transform (observable, down, up) {\n  if('function' !== typeof observable)\n    throw new Error('transform expects an observable')\n  return function (val) {\n    return (\n      isGet(val) ? down(observable())\n    : isSet(val) ? observable((up || down)(val))\n    : observable(function (_val) { val(down(_val)) })\n    )}}\n\nfunction not(observable) {\n  return transform(observable, function (v) { return !v })\n}\n\nfunction listen (element, event, attr, listener) {\n  function onEvent () {\n    listener('function' === typeof attr ? attr() : element[attr])\n  }\n  on(element, event, onEvent)\n  return function () {\n    off(element, event, onEvent)\n  }\n}\n\n//observe html element - aliased as `input`\nfunction attribute(element, attr, event) {\n  attr = attr || 'value'; event = event || 'input'\n  return function (val) {\n    return (\n      isGet(val) ? element[attr]\n    : isSet(val) ? element[attr] = val\n    : listen(element, event, attr, val)\n    )}\n}\n\n// observe a select element\nfunction select(element) {\n  function _attr () {\n      return element[element.selectedIndex].value;\n  }\n  function _set(val) {\n    for(var i=0; i < element.options.length; i++) {\n      if(element.options[i].value == val) element.selectedIndex = i;\n    }\n  }\n  return function (val) {\n    return (\n      isGet(val) ? element.options[element.selectedIndex].value\n    : isSet(val) ? _set(val)\n    : listen(element, 'change', _attr, val)\n    )}\n}\n\n//toggle based on an event, like mouseover, mouseout\nfunction toggle (el, up, down) {\n  var i = false\n  return function (val) {\n    function onUp() {\n      i || val(i = true)\n    }\n    function onDown () {\n      i && val(i = false)\n    }\n    return (\n      isGet(val) ? i\n    : isSet(val) ? undefined //read only\n    : (on(el, up, onUp), on(el, down || up, onDown), function () {\n      off(el, up, onUp); off(el, down || up, onDown)\n    })\n  )}}\n\nfunction error (message) {\n  throw new Error(message)\n}\n\nfunction compute (observables, compute) {\n  function getAll() {\n    return compute.apply(null, observables.map(function (e) {return e()}))\n  }\n  return function (val) {\n    return (\n      isGet(val) ? getAll()\n    : isSet(val) ? error('read-only')\n    : observables.forEach(function (obs) {\n        obs(function () { val(getAll()) })\n      })\n    )}}\n\nfunction boolean (observable, truthy, falsey) {\n  return transform(observable, function (val) {\n      return val ? truthy : falsey\n    }, function (val) {\n      return val == truthy ? true : false\n    })\n  }\n\nvar exports = value\nexports.bind1     = bind1\nexports.bind2     = bind2\nexports.value     = value\nexports.not       = not\nexports.property  = property\nexports.input     =\nexports.attribute = attribute\nexports.select    = select\nexports.compute   = compute\nexports.transform = transform\nexports.boolean   = boolean\nexports.toggle    = toggle\nexports.hover     = function (e) { return toggle(e, 'mouseover', 'mouseout')}\nexports.focus     = function (e) { return toggle(e, 'focus', 'blur')}\n\nif('object' === typeof module) module.exports = exports\nelse                           this.observable = exports\n})()\n\n//@ sourceURL=/node_modules/observable/index.js"
));

require.define("/example.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\nvar logger = require('./')\n\nsetInterval(function () {\n  console.log(new Date())\n}, 300)\n\n//@ sourceURL=/example.js"
));
require("/example.js");
})();

