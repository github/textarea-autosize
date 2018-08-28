# Textarea Autosize

Autosizes textarea to size of its contents.

## Installation

```
$ npm install @github/textarea-autosize
```

## Usage

The autosizing behavior must be explicitly activated on the `<textarea>`.

```js
import autosize from '@github/textarea-autosize'
autosize(document.querySelector('textarea.foo'))
```

Using a library like [selector-observer](https://github.com/josh/selector-observer), the behavior can automatically be applied to any textareas matching a class name.

```js
import {observe} from 'selector-observer'
import autosize from '@github/textarea-autosize'

observe('textarea.autosize', { subscribe: autosize })
```

## Browser support

- Chrome
- Firefox
- Safari
- Internet Explorer 11
- Microsoft Edge

## Development

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
