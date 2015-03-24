game.module(
	'game.scenes'
)
.body(function() {

function simulationStep() {
  if (game.scene.simulationAlive && game.scene.simulationAlive()) {
    forceSimulationStep();
  }
}

function forceSimulationStep() {
  game.simulation.step();
   if (game.scene.afterSimulationStep) {
    game.scene.afterSimulationStep()
  }
}
	
game.createScene('Explanation', {
	backgroundColor: 0xffffff,
    init: function() {
    	//ui_showExplanation();
    },
    keydown: function(key) {
        if (key === 'SPACE') {
            // ui_hideExplanation();
            game.system.setSceneNow(game['SceneLobby']);
        }
    },
    mousedown: function() {
    	game.system.setSceneNow(game['SceneLobby']);
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
      game.system.setSceneNow(game['SceneShowCar']);
    }
});

game.createScene('ShowCar', {
    backgroundColor: 0xffffff,
    init: function() {
       game.bet = null;
       this.clear();
    },
    newCar: function(data) {
      if (game.carBody) {
        game.carBody.kill();
      }
      game.carBody = game.simulation.seedCar(data.seed);
      forceSimulationStep();
      this.addObject(new game.UserSimulation());
    },
    gameEnd: function(data) {
       game.system.setSceneNow(game['SceneLobby']);
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
        game.system.setSceneNow(game['SceneSimulation']);
    }
});

game.createScene('Simulation', {
    backgroundColor: 0xffffff,
    init: function() {
      this.clear();
      this.addObject(new game.UserSimulation());
      this.world = {
        accumulator: 0,
        stepSize: 1/60,
        update: function() {
          this.accumulator += game.system.delta;
          if (this.accumulator > this.stepSize) {
            this.accumulator-= this.stepSize;
            forceSimulationStep(); 
          } 
        }
      }      
    },
    afterSimulationStep: function() {
        if (game.carBody.checkDeath()) {
          var gainedMoney = false;
          var resultPosition = game.carBody.resultPosition();
          if (resultPosition == 'left' && game.bet == 'left') {
           gainedMoney = true;
             game.money += 2000;
           }
         if (resultPosition == 'right' && game.bet == 'right') {         
          gainedMoney = true;
           game.money += 1000;
         }
         
         if (resultPosition == 'platform' && game.bet == 'platform') {
            gainedMoney = true;  
            game.money += 500;
          }

          if (!gainedMoney) {
            game.money -= 1000;
          }
           if (game.money < 0) {
              game.money = 0;
          }
          // ui_updateMoney();
          if (gainedMoney) {
            // ui_effectGainMoney();
          } else {
            // ui_effectLoseMoney();
          }

          game.socket.emit('ready for next car', {money: game.money});
          game.system.setSceneNow(game['SceneShowCar']);
        }
    },
     simulationAlive: function() {
      return true;
    }
});

});

