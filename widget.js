var EventEmitter = require('events').EventEmitter
var h = require('hyperscript')
var o = require('observable')

var log = console.log
module.exports = function (opts) {
  opts = opts || {}
  //a writable stream does not need pipe.
  //so inherit from EventEmitter is okay.
  var emitter = new EventEmitter()
  var follow = true

  opts.max = 10000
  opts.margin = opts.margin || 30
  opts.style = opts.style || {height: '100%', width: '50%'}
  opts.template = opts.template || function (args) {
    return h('pre', args.map(function (e, i) {
      //stringify the first item, like regular console.log
      if(!i) return String(e)
      try {
        return JSON.stringify(e, false, 2)
      } catch (e) {
        return String(e)
      }
    }).join(' '))
  }


  emitter.show = o()

  var inner  = h('div')
  var logger = h('div', {style: opts.style},
    {style: {
      overflow: 'scroll',
      display: o.boolean(emitter.show, 'block', 'none')
    }},
    inner)

  emitter.follow = function () {
    var el = inner.lastElementChild
    el && el.scrollIntoViewIfNeeded()
    follow = true
  }

  emitter.show(function (v) {
    if(v && follow)
      emitter.follow()
  })

  emitter.show(true)

  emitter.end = function () {}
  emitter.writable = true

  emitter.log =
  emitter.write = function (data) {
    var message = opts.template(data)

    var bottom = inner.getBoundingClientRect().bottom
    var size   = logger.getBoundingClientRect().bottom

    follow = bottom < size + opts.margin

    inner.appendChild(message)

    //if there is too much data in the log, remove some stuff.

    if(follow && emitter.show()) {
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

