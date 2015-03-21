#!/bin/bash

mkdir -p ./../client/browserify
browserify -t brfs -r ./../common:common -o ./../client/browserify/common.js
echo "browserify done"