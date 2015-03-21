#!/bin/bash

docker build -t pmeier/cars_v2 -f Dockerfile.server .
docker-compose -f docker-compose-dev.yml up -d