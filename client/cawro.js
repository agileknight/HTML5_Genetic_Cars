var common = require('common');

// Global Vars
var ghost;

var timeStep = 1.0 / 60.0;

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;

var debugbox = document.getElementById("debug");

var canvas = document.getElementById("mainbox");
var ctx = canvas.getContext("2d");

var cameraspeed = 0.05;
var camera_y = 0;
var camera_x = 0;
var camera_target = -1; // which car should we follow? -1 = leader

var generationSize = 20;
var cw_carArray = new Array();
var cw_carGeneration = new Array();
var cw_carScores = new Array();
var cw_topScores = new Array();
var cw_graphTop = new Array();
var cw_graphElite = new Array();
var cw_graphAverage = new Array();

var gen_champions = 1;
var gen_parentality = 0.2;
var gen_mutation = 0.05;
var mutation_range = 1;
var gen_counter = 0;
var nAttributes = 15;

var world;

var zoom = 70;

var mutable_floor = false;

var maxFloorTiles = 200;
var cw_floorTiles = new Array();
var last_drawn_tile = 0;

var groundPieceWidth = 1.5;
var groundPieceHeight = 0.15;

var chassisMaxAxis = 1.1;
var chassisMinAxis = 0.1;
var chassisMinDensity = 30;
var chassisMaxDensity = 300;

var wheelMaxRadius = 0.5;
var wheelMinRadius = 0.2;
var wheelMaxDensity = 100;
var wheelMinDensity = 40;

var velocityIndex = 0;
var deathSpeed = 0.1;

var swapPoint1 = 0;
var swapPoint2 = 0;

var cw_ghostReplayInterval = null;

var distanceMeter = document.getElementById("distancemeter");

var leaderPosition = new Object();
leaderPosition.x = 0;
leaderPosition.y = 0;

var socket = null;

var floorBody = null;
var carBody = null;
var money = null;
var maxMoney = null;
var bet = null;
var playerName = null;
var gameId = null;
var bet = null;

var simulation = common.simulation(box2dfps);

var gameStates = {
  explanation: {
    onEnter: function() {
      ui_showExplanation();
    },
    onKeydown: function(event) {
      if (event.which == $.ui.keyCode.SPACE) {
        ui_hideExplanation();
          changeToGameState(gameStates.lobby);
      }
    }
  },
  lobby: {
     onEnter: function() {
      ui_enterPlayerNameAndGameId(function(playerName, gameId) {
        server_joinGame({
         playerName: playerName,
         gameId: gameId
       });
      ui_showBuildingCarPool();
     });
    },
    gameJoined: function(data) {
      money = data.money;
      ui_hideBuildingCarPool();
      changeToGameState(gameStates.init);
    }
  },
  init: {
    onEnter: function() {
      maxMoney = money;
      ui_hideMoney();
      ui_updateMoney();
      ui_effectInitMoney();
      ui_clearEventbox();
      changeToGameState(gameStates.showCar);
    }
  },
  showCar: {
    onEnter: function() {
      bet = null;
    },
    newCar: function(data) {
      if (carBody) {
        carBody.kill();
      }
      carBody = simulation.seedCar(data.seed);
      forceSimulationStep();
    },
    gameEnd: function(data) {
      changeToGameState(gameStates.end);
    },
    onKeydown: function(event) {
      if (bet != null) {
        return;
      }
      if (event.which == $.ui.keyCode.LEFT) {
        bet = 'left';
      }
      if (event.which == $.ui.keyCode.RIGHT) {
        bet = 'right';
      }
      if (event.which == $.ui.keyCode.DOWN) {
        bet = 'platform';
      }

      if (bet != null) {
        socket.emit('place bet', {bet: bet});
      }
    },
    startSimulation: function(data) {
        changeToGameState(gameStates.simulation);
    }
  },
  simulation: {
    afterSimulationStep: function() {
        if (carBody.checkDeath()) {
          changeToGameState(gameStates.score);
        }
    },
     simulationAlive: function() {
      return true;
    }
  },
  score: {
     onEnter: function() {
      var gainedMoney = false;
      var resultPosition = carBody.resultPosition();
      if (resultPosition == 'left' && bet == 'left') {
       gainedMoney = true;
         money += 2000;
       }
     if (resultPosition == 'right' && bet == 'right') {         
      gainedMoney = true;
       money += 1000;
     }
     
     if (resultPosition == 'platform' && bet == 'platform') {
        gainedMoney = true;  
        money += 500;
      }

      if (!gainedMoney) {
        money -= 1000;
      }
       if (money < 0) {
          money = 0;
      }
      ui_updateMoney();
      if (gainedMoney) {
        ui_effectGainMoney();
      } else {
        ui_effectLoseMoney();
      }
      
      changeToGameState(gameStates.showCar);
      socket.emit('ready for next car', {money: money});
    }
  },
  end: {
    onEnter: function() {
     changeToGameState(gameStates.lobby);
  }
}
};
var curGameState = null;

function changeToGameState(state) {
  curGameState = state
  if (state.onEnter) {
    state.onEnter();
  }
}

function server_joinGame(data) {
  socket.emit('join game', data);
}

function ui_showExplanation() {
  $("#explanationDialog").dialog({
    dialogClass: 'no-close',
    width: 550,
    position: { my: "center", at: "center", of: canvas}
  });
}

function ui_hideExplanation() {
  $("#explanationDialog").dialog("close");
}

function ui_hideMoney() {
  $("#moneyContainer").hide();
  $("#maxMoneyContainer").hide();
}

function ui_updateMoney() {
  if (money > maxMoney) {
    maxMoney = money;
  }
  $("#money").html(money);
  $("#maxMoney").html(maxMoney);
}

function ui_effectInitMoney(effect) {
  var cont = $("#moneyContainer");
  cont.show();
  cont.effect("slide", {}, 500, null);

  var cont2 = $("#maxMoneyContainer");
  cont2.show();
  cont2.effect("slide", {}, 500, null);
}

function ui_clearEventbox() {
  $("#eventbox").empty();
  $("#eventbox").scrollTop(0);
}

function ui_effectGainMoney(effect) {
  $("#moneyContainer").effect("highlight", {}, 500, null);
}

function ui_effectLoseMoney(effect) {
  $("#moneyContainer").effect("highlight", {color: "#ff0000"}, 500, null).dequeue().effect("shake", {}, 500, null);
}

function ui_enterPlayerNameAndGameId(doneCallback) {
  $("#joinGameDialog").dialog({
    dialogClass: 'no-close',
    width: 550,
    position: { my: "center", at: "center", of: canvas},
    buttons: [
    {
      text: "OK",
      click: function() {
        var playerName = $(this).find(':input[name="playerName"]').val();
        var gameId = $(this).find(':input[name="gameId"]').val();
        if (playerName == "" || gameId == "") {
            return;
        }
        doneCallback(playerName, gameId);
        $( this ).dialog( "close" );
      }
    }
  ]
  })
}

function ui_showBuildingCarPool() {
  $("#buildingCarPoolDialog").dialog({
    dialogClass: 'no-close',
    width: 550,
    position: { my: "center", at: "center", of: canvas}
  });
}

function ui_hideBuildingCarPool() {
  $("#buildingCarPoolDialog").dialog("close");
}

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(400, 200);
  ctx.scale(1.5*zoom, -zoom);
  cw_drawFloor(floorBody);
  cw_drawCar(carBody);
  ctx.restore();
}

function cw_drawFloor(floorBody) {
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#666";
  ctx.lineWidth = 1/zoom;
  ctx.beginPath();

  for (f = floorBody.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      cw_drawVirtualPoly(floorBody, s.m_vertices, s.m_vertexCount);
  }
  ctx.fill();
  ctx.stroke();
}

function cw_drawCar(carBody) {
  if (!carBody) {
    return
  }
    myCar = carBody
    if(!myCar.alive) {
      return;
    }
    myCarPos = myCar.getPosition();

    if(myCarPos.x < (camera_x - 5)) {
      // too far behind, don't draw
      return;
    }

    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1/zoom;

    for (var i = 0; i < myCar.wheels.length; i++){
      b = myCar.wheels[i];
      for (f = b.GetFixtureList(); f; f = f.m_next) {
        var s = f.GetShape();
        var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelMaxDensity).toString();
        var rgbcolor = "rgb("+color+","+color+","+color+")";
        cw_drawCircle(b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
      }
    }
    
    var densitycolor = Math.round(100 - (70 * ((myCar.car_def.chassis_density - chassisMinDensity) / chassisMaxDensity))).toString() + "%";
    if(myCar.is_elite) {
      ctx.strokeStyle = "#44c";
      //ctx.fillStyle = "#ddf";
      ctx.fillStyle = "hsl(240,50%,"+densitycolor+")";
    } else {
      ctx.strokeStyle = "#c44";
      //ctx.fillStyle = "#fdd";
      ctx.fillStyle = "hsl(0,50%,"+densitycolor+")";
    }
    ctx.beginPath();
    var b = myCar.chassis;
    for (f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      cw_drawVirtualPoly(b, s.m_vertices, s.m_vertexCount);
    }
    ctx.fill();
    ctx.stroke();
}

function cw_drawVirtualPoly(body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);
}

function cw_drawPoly(body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  ctx.beginPath();

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);

  ctx.fill();
  ctx.stroke();
}

function cw_drawCircle(body, center, radius, angle, color) {
  var p = body.GetWorldPoint(center);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2*Math.PI, true);

  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + radius*Math.cos(angle), p.y + radius*Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */


function simulationStep() {
  if (curGameState.simulationAlive && curGameState.simulationAlive()) {
    forceSimulationStep();
  }
}

function forceSimulationStep() {
  simulation.step();
   if (curGameState.afterSimulationStep) {
    curGameState.afterSimulationStep()
  }
}

function ui_printEvent(message) {
  $("#eventbox").append(message + "<br/>");
  $('#eventbox').scrollTop($('#eventbox').height())
}

function cw_init() {
  var endpoint = window.location.protocol + "//" + window.location.hostname + ":3000";
  socket = io(endpoint);

  socket.on('game joined', function(data) {
      if(curGameState.gameJoined) {
        curGameState.gameJoined(data);
      }
  });

  socket.on('new car', function(data) {
    ui_printEvent("Rounds left: " + data.roundsLeft);
    if (curGameState.newCar) {
      curGameState.newCar(data);
    }
  });

  socket.on('start simulation', function(data) {
    if (curGameState.startSimulation) {
      curGameState.startSimulation(data);
    }
  });
  
  socket.on('game end', function(data) {
    ui_printEvent("Game has ended");
    if (curGameState.gameEnd) {
      curGameState.gameEnd(data);
    }
  });  

  socket.on('player update', function(data) {
    ui_printEvent(data.name + " with " + data.money + "$");
  }); 

  socket.on('player left', function(data) {
    ui_printEvent(data.name + " left");
  }); 

  socket.on('player joined', function(data) {
    ui_printEvent(data.name + " joined");
  }); 

  socket.on('player bet', function(data) {
    ui_printEvent(data.name + " bet " + data.bet);
  });

  floorBody = simulation.createFloor();

    changeToGameState(gameStates.explanation);
$(document.body).keydown(function(event) {
  if (curGameState.onKeydown) {
    curGameState.onKeydown(event)
    return false;
  };
  return true;
});

  cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));
  cw_drawInterval    = setInterval(cw_drawScreen,  Math.round(1000/screenfps));
}

cw_init();

