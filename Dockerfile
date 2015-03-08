FROM dockerfile/ubuntu

RUN \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y nodejs && \
  apt-get install -y npm && \
  rm -rf /var/lib/apt/lists/*

ADD server /opt/app/server

WORKDIR /opt/app/server

RUN npm install

CMD ["nodejs", "server.js"]