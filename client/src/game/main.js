game.module(
    'game.main'
)
.require(
    'game.assets',
    'game.objects',
    'game.scenes'
)
.body(function() {
	var endpoint = window.location.protocol + "//" + window.location.hostname + ":3000";
  	game.socket = io(endpoint);

  	game.socket.on('game joined', function(data) {
      if(game.scene.gameJoined) {
        game.scene.gameJoined(data);
      }
  	});

  game.socket.on('new car', function(data) {
    //ui_printEvent("Rounds left: " + data.roundsLeft);
    if (game.scene.newCar) {
      game.scene.newCar(data);
    }
  });

  game.socket.on('start simulation', function(data) {
    if (game.scene.startSimulation) {
      game.scene.startSimulation(data);
    }
  });
  
  game.socket.on('game end', function(data) {
    //ui_printEvent("Game has ended");
    if (game.scene.gameEnd) {
      game.scene.gameEnd(data);
    }
  });  

  game.socket.on('player update', function(data) {
    //ui_printEvent(data.name + " with " + data.money + "$");
  }); 

  game.socket.on('player left', function(data) {
    //ui_printEvent(data.name + " left");
  }); 

  game.socket.on('player joined', function(data) {
    //ui_printEvent(data.name + " joined");
  }); 

  game.socket.on('player bet', function(data) {
    //ui_printEvent(data.name + " bet " + data.bet);
  });

// TODO move to correct scene
  // floorBody = simulation.createFloor();


  // TODO add timer trigger to simulation scene
  //cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));

  // TODO how to do this?
  //cw_drawInterval    = setInterval(cw_drawScreen,  Math.round(1000/screenfps));
});
