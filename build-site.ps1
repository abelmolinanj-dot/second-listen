# Builds the public site's index.html from second-listen.html, the one source file for both versions.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$body = [IO.File]::ReadAllText("$root\second-listen.html")
$head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0f0b0a"><meta name="description" content="Hear your classes again: transcripts, replay, a highlight reel and flashcards. Free, with your audio kept on your device."><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
[IO.File]::WriteAllText("$root\index.html", $head + $body + '</body></html>', (New-Object Text.UTF8Encoding $false))
if (-not (Test-Path "$root\.nojekyll")) { [IO.File]::WriteAllText("$root\.nojekyll", "") }
"Built index.html"
