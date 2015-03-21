#!/bin/bash

#nodemon --watch /opt/app -e js --exec "./browserify.sh" &

nodemon --watch /opt/app/server --watch /opt/app/common -e js server.js

#wait