var center = require('center')
var widget = require('./widget')
var colapse = require('./colapse')

//create console.log if does not exist, i.e. IE.
if('undefined' === typeof console) {
  globals.console = {}
  console.log = function () {}
  console.error = function () {}
}

var emitter = widget({style: {
  height: '400px',
  width: '200px',
  'border-bottom': '1px dotted black'
}})

function wrap (name) {
  var log = console[name]
  console[name] = function () {
    var args = [].slice.call(arguments)
    emitter.write(args)
    log.apply(console, args)
  }
}

wrap('log')
wrap('error')

window.addEventListener('error', function (err) {
  emitter.write([err.stack])
})

document.body.appendChild(
  center(
    colapse(emitter.element)
  )
)

module.exports = emitter
