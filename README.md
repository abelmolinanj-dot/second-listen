# Second Listen

**[Open Second Listen](https://abelmolinanj-dot.github.io/second-listen/)**

Hear your classes again. Upload a recording and get a transcript you can replay from any sentence, a highlight reel of what matters, and flashcards. It's free, needs no account, and your audio stays on your device.

- [About](https://abelmolinanj-dot.github.io/second-listen/about.html): how it works and what it can't do yet
- [Privacy](https://abelmolinanj-dot.github.io/second-listen/privacy.html)
- [Terms](https://abelmolinanj-dot.github.io/second-listen/terms.html)

Found a bug or have an idea? [Open an issue](https://github.com/abelmolinanj-dot/second-listen/issues).

## What's in this repository

- `second-listen.html` is the app.
- `build-site.ps1` builds `index.html`, the public website, from it.
- `about.html`, `privacy.html`, `terms.html` and `404.html` are the site's other pages, styled by `pages.css`.
- `a/` and `b/` hold the speech models.

## Credits

Speech recognition uses [OpenAI Whisper](https://github.com/openai/whisper) (MIT License), through the [Xenova ONNX conversions](https://huggingface.co/Xenova/whisper-tiny) and [Transformers.js](https://github.com/huggingface/transformers.js) (Apache License 2.0).

Full license texts are in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt).

## Copyright

Copyright 2026 abelmolinanj-dot. All rights reserved, except for the third-party components above, which stay under their own licenses. The code is public so people can see how the app works and check its privacy claims.
