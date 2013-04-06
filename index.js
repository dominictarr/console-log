var widget = require('./widget')
var o      = require('observable')
var h      = require('hyperscript')

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
  h('div',
    {style: {
      background: 'white',
      border: '1px solid black',
      position: 'fixed',
      right: '20px',
      bottom: '20px'
    }},
    emitter.element,
    h('div',
      o.boolean(emitter.show, '>', '<'),
      {onclick: function () {
        emitter.show(!emitter.show())
      }},
      {style: {
        'margin': '10px',
        'min-width': '20px',
        'min-height': '20px',
        'text-align': 'center'
      }}
    )
  )
)

emitter.show(false)

module.exports = emitter
