# Start server here

#!/usr/bin/env bash

if [[ "$1" == "" ]]; then
  echo 'Using default port 3000';
  ./node_modules/.bin/http-server ./static -p 3000 -c-1 -d false -P http://localhost:3000/frame-player.html;
else
  ./node_modules/.bin/http-server ./static -p $1 -c-1 -d false -P http://localhost:$1/frame-player.html;
fi
