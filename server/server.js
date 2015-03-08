var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

function log(message, socket) {
	console.log(socket.id + ': ' + message);
}

io.on('connection', function(socket){
 	log('client connected', socket);
  	socket.on('disconnect', function(){
  		log('client disconnected', socket);
	});
	socket.on('join game', function(data) {
		log('game joined', socket);
		socket.emit('game joined', {money: 2000});
	});
});

http.listen(3000, function(){
 	console.log('listening on *:3000');
});