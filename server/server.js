var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', function(socket){
 	console.log('a user connected');
  	socket.on('disconnect', function(){
  		console.log('a user disconnected');
	});
	socket.on('join game', function(data) {
		socket.emit('game joined', {money: 2000});
	});
});

http.listen(3000, function(){
 	console.log('listening on *:3000');
});