game.module(
	'game.scenes'
)
.body(function() {
	
game.createScene('Explanation', {
	backgroundColor: 0xffffff,
    init: function() {
    	//ui_showExplanation();
    },
    keydown: function(key) {
        if (key === 'SPACE') {
            // ui_hideExplanation();
            game.system.setScene('Lobby');
        }
    },
    mousedown: function() {
    	game.system.setScene('Lobby');
	}
});

game.createScene('Lobby', {
	backgroundColor: 0xffffff,
	init: function() {
	 // ui_enterPlayerNameAndGameId(function(playerName, gameId) {
  //       server_joinGame({
  //        playerName: playerName,
  //        gameId: gameId
  //      });
  //     ui_showBuildingCarPool();
  //    });
     game.socket.emit('join game', {
         playerName: 'test',
         gameId: 'test'
       });
	},
	gameJoined: function(data) {
      game.money = data.money;
      // ui_hideBuildingCarPool();
      console.log("game joined");
      game.maxMoney = game.money;
      game.system.setScene('ShowCar');
    }
});

game.createScene('ShowCar', {
    backgroundColor: 0xffffff,
    init: function() {
         console.log("game initialized");
       game.bet = null;
    },
    newCar: function(data) {
      if (game.carBody) {
        game.carBody.kill();
      }
      game.carBody = simulation.seedCar(data.seed);
      forceSimulationStep();
    },
    gameEnd: function(data) {
       game.system.setScene('Lobby');
    },
    keydown: function(key) {
      if (game.bet != null) {
        return;
      }
      if (key == 'LEFT') {
        game.bet = 'left';
      }
      if (key == 'RIGHT') {
        game.bet = 'right';
      }
      if (key == 'DOWN') {
        game.bet = 'platform';
      }

      if (game.bet != null) {
        game.socket.emit('place bet', {bet: game.bet});
      }
    },
    startSimulation: function(data) {
        game.system.setScene('Simulation');
    }
});

game.createScene('Simulation', {
    backgroundColor: 0xffffff,
    afterSimulationStep: function() {
        if (game.carBody.checkDeath()) {


   var gainedMoney = false;
      var resultPosition = game.carBody.resultPosition();
      if (resultPosition == 'left' && bet == 'left') {
       gainedMoney = true;
         game.money += 2000;
       }
     if (resultPosition == 'right' && bet == 'right') {         
      gainedMoney = true;
       game.money += 1000;
     }
     
     if (resultPosition == 'platform' && bet == 'platform') {
        gainedMoney = true;  
        game.money += 500;
      }

      if (!gainedMoney) {
        game.money -= 1000;
      }
       if (money < 0) {
          game.money = 0;
      }
      // ui_updateMoney();
      if (gainedMoney) {
        // ui_effectGainMoney();
      } else {
        // ui_effectLoseMoney();
      }

      socket.emit('ready for next car', {money: game.money});
          game.system.setScene('ShowCar');
        }
    },
     simulationAlive: function() {
      return true;
    }
});

});

