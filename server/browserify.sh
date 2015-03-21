#!/bin/bash

mkdir -p ./../client/browserify
browserify -t brfs ./../common/index.js > ./../client/browserify/common.js