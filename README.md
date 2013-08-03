# template

A simple Nodejs EJS templating module

## API

### options

```js
{
  basedir:    '.',    // Where to look for template files
  autoreload: false,  // Automatically reload templates when changed
  debug:      false,  // Print some information to stdout
}
```

### from_file(filename, [options], callback(err, template))

Example:

```html
<!-- time.html -->
<html><body><p>Time is now <%= time %></p></body></html>
```

```js
template.from_file('time.html', function(err, template) {
  console.log(template({time: Date.now()}));
});
```

```html
<html><body><p>Time is now 1375566775500</p></body></html>
```

### middleware([options]) -> function

A [connect](https://github.com/senchalabs/connect)-style middleware.

Example:

```js
var connect = require('connect');
var template = require('template');
connect()
  .use(template.middleware({basedir: __dirname+'/public'}))
  .use(function (req, res, next) {
    res.endTemplate('time.html', {time: Date.now()});
  })
  .listen(3000, '127.0.0.1');
```

```txt
$ curl -i http://localhost:3000/
HTTP/1.1 200 OK
Content-Length: 259
Date: Sat, 03 Aug 2013 22:08:42 GMT
Connection: keep-alive

<html><body><p>Time is now 1375567722771</p></body></html>
```

Example of using `writeTemplate` instead of `endTemplate`:

```js
...
    res.writeTemplate('time.html', {time: Date.now()}, function (err) {
      if (err) return next(err);
      // do something else or call res.end()
    });
...
```

## MIT License

Copyright (c) 2013 Rasmus Andersson <http://rsms.me/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
