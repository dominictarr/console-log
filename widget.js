var EventEmitter = require('events').EventEmitter
var h = require('hyperscript')

var log = console.log
module.exports = function (opts) {
  opts = opts || {}
  //a writable stream does not need pipe.
  //so inherit from EventEmitter is okay.
  var emitter = new EventEmitter()

  opts.max = 10000
  opts.margin = opts.margin || 30
  opts.style = opts.style || {height: '100%', width: '50%'}
  opts.template = opts.template || function (args) {
    return h('pre', args.map(function (e) {
      try {
        return JSON.stringify(e, false, 2)
      } catch (e) {
        return String(e)
      }
    }).join(' '))
  }

  var inner  = h('div')
  var logger = h('div', {style: opts.style}, {style: {overflow: 'scroll'}}, inner)

  emitter.end = function () {}
  emitter.writable = true

  emitter.follow = true
  emitter.log =
  emitter.write = function (data) {
    var message = opts.template(data)

    var bottom = inner.getBoundingClientRect().bottom
    var size   = logger.getBoundingClientRect().bottom

    emitter.follow = bottom < size + opts.margin

    inner.appendChild(message)

    //if there is too much data in the log, remove some stuff.

    if(emitter.follow) {
      while(inner.clientHeight > opts.max && inner.children.length) {
        inner.removeChild(inner.firstChild)
      }
      message.scrollIntoViewIfNeeded()
    }
    return true
  }

  emitter.element = logger
  return emitter
}

