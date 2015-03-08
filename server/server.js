var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var randomstring = require("randomstring");

function log(message, socket) {
	console.log(socket.id + ': ' + message);
}

var gameStates = {
	betting: {
		onEnter: function(game) {
			game.carSeed = randomstring.generate();
			game.room.emit('new car', {seed: game.carSeed});
		},
		playerBet: function(game, socket, data) {
			socket.broadcast.to(game.id).emit('player bet', {clientId: socket.id, data: data});
			game.players[socket.id].bet = data.bet;
			var allBet = true;
			Object.keys(game.players).forEach(function(playerId) {
				if (game.players[playerId] == null) {
					allBet = false;
				}
			});
			if (allBet) {
				game.room.emit('start simulation', {});
				changeToState(game, gameStates.scoring);
			}
		},
		playerJoin: function(game, socket, data) {
			socket.emit('new car', {seed: game.carSeed});
		}
	},
	scoring: {
		
	},
}

var games = {};
var gamesByClient = {};

function changeToState(game, state) {
	game.curState = state;
	if (state.onEnter) {
		state.onEnter(game);
	}
}

function gameExists(gameId) {
	return games[gameId] != null;
}

function createGame(gameId) {
	var game = {
		id: gameId,
		players: {},
		room: io.to(gameId)
	};
	games[gameId] = game;
	changeToState(game, gameStates.betting);
}

function joinGame(gameId, socket, data) {
	var game = games[gameId];
	gamesByClient[socket.id] = game;
	game.players[socket.id] = {
		name: data.playerName,
		socket: socket,
	};
	socket.join(gameId);
	socket.emit('game joined', {money: 2000});
	socket.broadcast.to(game.id).emit('player joined', {playerId: socket.id});
	if (game.curState.playerJoin) {
		game.curState.playerJoin(game, socket, data);
	}
}

function playerBet(socket, data) {
	var game = gamesByClient[socket.id];
	if (game) {
		if (game.curState.playerBet) {
			game.curState.playerBet(game, socket, data);
		}
	}
}

function leaveGame(socket) {
	var game = gamesByClient[socket.id];
	if (game) {
		game.room.emit('player left', {playerId: socket.id});
		delete gamesByClient[socket.id];
		delete game.players[socket.id];
		if (Object.keys(game.players).length == 0) {
			delete games[game.id];
			game.room.emit('closing game', {id: game.id});
		}
	}
}

io.on('connection', function(socket){
 	log('client connected', socket);
  	socket.on('disconnect', function(){
  		log('client disconnected', socket);
  		leaveGame(socket);
	});
	socket.on('join game', function(data) {
		log('receive join game with data ' + JSON.stringify(data), socket);

		if (!gameExists(data.gameId)) {
			createGame(data.gameId);
		}

		joinGame(data.gameId, socket, data);
	});
	socket.on('place bet', function(data) {
		playerBet(socket, data);
	});
});

http.listen(3000, function(){
 	console.log('listening on *:3000');
});