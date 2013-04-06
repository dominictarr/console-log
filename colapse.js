var h = require('hyperscript')
var o = require('observable')

module.exports = function (element) {
  var state = o()

  state(function (show) {
    element.style.display = show ? 'block' : 'none'
  })

  state(false)

  return h('div',
    {style: {background: 'white', border: '1px solid black' }},
    element,
    h('div',
      o.boolean(state, '>', '<'),
      {onclick: function () {
        state(!state())
      }},
      {style: {
        'margin': '10px',
        'min-width': '20px',
        'min-height': '20px',
        'text-align': 'center'
      }}
    )
  )
}
