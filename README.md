# console-log

A console widget for viewing logs in your browser.

Now, you can easily see `console.log` in every browser,
even on mobile.

Also, the bottom is sticky - _unlike chrome dev tools_ -
so if you are scrolled to the bottom, output will track new messages,
but if you scroll up, you can focus on old ones.

USE WITH [BROWSERIFY](http://browserify.org)

## Example

``` js
if(DEVELOPMENT) require('console-log')
```

will add a widget in the bottom right corner of your screen.

If you want more control, and want to insert it into the DOM your self,
you can access the core yourself.

``` js
var logger = require('console-log/widget')()
document.body.appendChild(logger.element)

logger.write('hello')
```

## License

MIT
