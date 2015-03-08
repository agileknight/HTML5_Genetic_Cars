#!/bin/bash

docker build -t pmeier/cars_v2_web -f Dockerfile.client .
docker build -t pmeier/cars_v2 -f Dockerfile.server .
docker-compose pull
docker-compose up -d