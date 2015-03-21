var express = require('express')
var app = express();
var webApp = express();
var webHttp = require('http').Server(webApp);
var http = require('http').Server(app);
var io = require('socket.io')(http);
var randomstring = require("randomstring");

function log(message, socket) {
	console.log(socket.id + ': ' + message);
}

var gameStates = {
	betting: {
		onEnter: function(game) {
			Object.keys(game.players).forEach(function(playerId) {
				var player = game.players[playerId];
				player.isPlaying = true;
				player.readyForNextCar = false;
				player.bet = null;
				game.room.emit('player update', {
					id: playerId,
					name: player.name,
					money: player.money
				});
			});

			game.carSeed = randomstring.generate();
			game.room.emit('new car', {
				seed: game.carSeed,
				roundsLeft: game.roundsLeft
			});
		},
		playerBet: function(game, socket, data) {
			game.room.emit('player bet', {clientId: socket.id, name: game.players[socket.id].name, bet: data.bet});
			game.players[socket.id].bet = data.bet;
			var allBet = true;
			Object.keys(game.players).forEach(function(playerId) {
				if (game.players[playerId].isPlaying && game.players[playerId].bet == null) {
					allBet = false;
				}
			});
			if (allBet) {
				game.room.emit('start simulation', {});
				changeToState(game, gameStates.scoring);
			}
		},
		playerJoin: function(game, socket, data) {
			game.players[socket.id].isPlaying = true;
			game.players[socket.id].readyForNextCar = false;
			socket.emit('new car', {
				seed: game.carSeed,
				roundsLeft: game.roundsLeft
			});
		},
		playerLeft: function(game, socket) {
			var allBet = true;
			Object.keys(game.players).forEach(function(playerId) {
				if (game.players[playerId].isPlaying && game.players[playerId].bet == null) {
					allBet = false;
				}
			});
			if (allBet) {
				game.room.emit('start simulation', {});
				changeToState(game, gameStates.scoring);
			}
		}
	},
	scoring: {
		readyForNextCar: function(game, socket, data) {
			game.players[socket.id].readyForNextCar = true;
			game.players[socket.id].money = data.money;
			var allReady = true;
			Object.keys(game.players).forEach(function(playerId) {
				if (game.players[playerId].isPlaying && !game.players[playerId].readyForNextCar) {
					allReady = false;
				}
			});
			if (allReady) {
				if (game.roundsLeft > 1) {
					game.roundsLeft -= 1;
					changeToState(game, gameStates.betting);
				} else {
					changeToState(game, gameStates.end);
				}
			}
		},
		playerLeft: function(game, socket) {
			var allReady = true;
			Object.keys(game.players).forEach(function(playerId) {
				if (game.players[playerId].isPlaying && !game.players[playerId].readyForNextCar) {
					allReady = false;
				}
			});
			if (allReady) {
				if (game.roundsLeft > 1) {
					game.roundsLeft -= 1;
					changeToState(game, gameStates.betting);
				} else {
					changeToState(game, gameStates.end);
				}
			}
		}
	},
	end: {
		onEnter: function(game) {
			game.room.emit('game end', {});
			Object.keys(game.players).forEach(function(playerId) {
				var player = game.players[playerId];
				game.room.emit('player update', {
					id: playerId,
					name: player.name,
					money: player.money
				});
			});
			delete games[game.id];
		},
	}
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
		room: io.to(gameId),
		roundsLeft: 10
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
		isPlaying: false
	};
	socket.join(gameId);
	socket.emit('game joined', {money: 2000});
	game.room.emit('player joined', {playerId: socket.id, name: data.playerName});

	Object.keys(game.players).forEach(function(playerId) {
				var player = game.players[playerId];
				if (playerId != socket.id) {
					socket.emit('player joined', {playerId: playerId, name: game.players[playerId].name});
				}
			});

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

function readyForNextCar(socket, data) {
	var game = gamesByClient[socket.id];
	if (game) {
		if (game.curState.readyForNextCar) {
			game.curState.readyForNextCar(game, socket, data);
		}
	}
}

function leaveGame(socket) {
	var game = gamesByClient[socket.id];
	if (game) {
		game.room.emit('player left', {playerId: socket.id, name: game.players[socket.id].name});
		delete gamesByClient[socket.id];
		delete game.players[socket.id];
		if (Object.keys(game.players).length == 0) {
			delete games[game.id];
			game.room.emit('closing game', {id: game.id});
		} else {
			if (game.curState.playerLeft) {
				game.curState.playerLeft(game, socket);
			}
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
	socket.on('ready for next car', function(data) {
		readyForNextCar(socket, data);
	});
});

http.listen(3000, function(){
 	console.log('app listening on *:3000');
});

webApp.use(express.static(__dirname + '/../client'));
webHttp.listen(80, function(){
 	console.log('webApp listening on *:80');
});