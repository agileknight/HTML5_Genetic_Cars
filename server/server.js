var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

function log(message, socket) {
	console.log(socket.id + ': ' + message);
}

var gameStates = {
	init: {
		joinGame: function (game, socket, data) {
			socket.emit('game joined', {money: 2000});
		}
	},
	betting: {

	},
	simulation: {

	},
	scoreing: {

	},
	end: {

	}
}

var games = {};

function gameExists(gameId) {
	return games[gameId] != null;
}

function createGame(gameId) {
	games[gameId] = {
		players: {},
		curState: gameStates.init
	};
}

function joinGame(gameId, socket, data) {
	var game = games[gameId];
	if (game.curState.joinGame) {
		game.curState.joinGame(game, socket, data);
	}
}

io.on('connection', function(socket){
 	log('client connected', socket);
  	socket.on('disconnect', function(){
  		log('client disconnected', socket);
	});
	socket.on('join game', function(data) {
		log('receive join game with data ' + JSON.stringify(data), socket);

		if (!gameExists(data.gameId)) {
			createGame(data.gameId);
		}

		joinGame(data.gameId, socket, data);
	});
});

http.listen(3000, function(){
 	console.log('listening on *:3000');
});