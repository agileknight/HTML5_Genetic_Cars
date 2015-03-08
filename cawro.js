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

var gravity = new b2Vec2(0.0, -9.81);
var doSleep = true;

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
var max_car_health = box2dfps * 10;
var car_health = max_car_health;

var motorSpeed = 20;

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
var gameStates = {
  explanation: {
    onEnter: function() {
      ui_showExplanation();
    },
    onKeydown: function(event) {
      if (event.which == $.ui.keyCode.SPACE) {
        ui_hideExplanation();
          changeToGameState(gameStates.init);
      }
    }
  },
  init: {
    onEnter: function() {
      money = 2000;
      maxMoney = money;
      ui_hideMoney()
      ui_updateMoney()
      ui_effectInitMoney()
      changeToGameState(gameStates.showCar)
    }
  },
  showCar: {
    onEnter: function() {
      if (carBody) {
        carBody.kill()
      }
      carDef = cw_createRandomCar()
      carBody = new cw_Car(carDef)
      forceSimulationStep();
    },
    onKeydown: function(event) {
      var didBet = false
      if (event.which == $.ui.keyCode.LEFT) {
        bet = 'left';
          didBet = true
      }
      if (event.which == $.ui.keyCode.RIGHT) {
        bet = 'right';
          didBet = true
      }
      if (event.which == $.ui.keyCode.DOWN) {
        bet = 'platform';
          didBet = true
      }

      if (didBet) {
        changeToGameState(gameStates.simulation)
      }
    }
  },
  simulation: {
    afterSimulationStep: function() {
        if (carBody.checkDeath()) {
          changeToGameState(gameStates.score)
        }
    },
     simulationAlive: function() {
      return true;
    }
  },
  score: {
     onEnter: function() {
      var gainedMoney = false;
      if (carBody.getPosition().y < -4.0) {
        if (carBody.getPosition().x < -1.0 && bet == 'left') {
          gainedMoney = true;
            money += 2000;
        }
        if (carBody.getPosition().x > 1.0 && bet == 'right') {
          gainedMoney = true;
            money += 1000;
        }
      } else {
        if (bet == 'platform') {
          gainedMoney = true;
          money += 500;
        }
      }
      if (!gainedMoney) {
        money -= 1000;
      }
      ui_updateMoney();
      if (gainedMoney) {
        ui_effectGainMoney();
      } else {
        ui_effectLoseMoney();
      }
      
      if (money < 0) {
          changeToGameState(gameStates.end)
      } else {
       changeToGameState(gameStates.showCar)
     }
    }
  },
  end: {
    onEnter: function() {
     alert("Out of money. Highscore: " + maxMoney + "$")
     changeToGameState(gameStates.init)
  }
}
};
var curGameState = null;

function changeToGameState(state) {
  curGameState = state
  if (state.onEnter) {
    state.onEnter()
  }
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

function ui_effectGainMoney(effect) {
  $("#moneyContainer").effect("highlight", {}, 500, null);
}

function ui_effectLoseMoney(effect) {
  $("#moneyContainer").effect("highlight", {color: "#ff0000"}, 500, null).dequeue().effect("shake", {}, 500, null);
}

function debug(str, clear) {
  if(clear) {
    debugbox.innerHTML = "";
  }
  debugbox.innerHTML += str+"<br />";
}

function showDistance(distance, height) {
  distanceMeter.innerHTML = "distance: "+distance+" meters<br />";
  distanceMeter.innerHTML += "height: "+height+" meters";
  if(distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function() {
  this.__constructor.apply(this, arguments)
}

cw_Car.prototype.chassis = null;

cw_Car.prototype.wheels = [];

cw_Car.prototype.__constructor = function(car_def) {
  this.velocityIndex = 0;
  this.health = max_car_health;
  this.maxPosition = 0;
  this.maxPositiony = 0;
  this.minPositiony = 0;
  this.frames = 0;
  this.car_def = car_def
  this.alive = true;
  this.is_elite = car_def.is_elite;
 
  this.chassis = cw_createChassis(car_def.vertex_list, car_def.chassis_density);
  
  this.wheels = [];
  for (var i = 0; i < car_def.wheelCount; i++){
    this.wheels[i] = cw_createWheel(car_def.wheel_radius[i], car_def.wheel_density[i]);
  }
  
  var carmass = this.chassis.GetMass();
  for (var i = 0; i < car_def.wheelCount; i++){
    carmass += this.wheels[i].GetMass();
  }
  var torque = [];
  for (var i = 0; i < car_def.wheelCount; i++){
    torque[i] = carmass * -gravity.y / car_def.wheel_radius[i];
  }
  
  var joint_def = new b2RevoluteJointDef();

  for (var i = 0; i < car_def.wheelCount; i++){
    var randvertex = this.chassis.vertex_list[car_def.wheel_vertex[i]];
    joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
    joint_def.localAnchorB.Set(0, 0);
    joint_def.maxMotorTorque = torque[i];
    joint_def.motorSpeed = -motorSpeed;
    joint_def.enableMotor = true;
    joint_def.bodyA = this.chassis;
    joint_def.bodyB = this.wheels[i];
    var joint = world.CreateJoint(joint_def);
  }
}

cw_Car.prototype.getPosition = function() {
  return this.chassis.GetPosition();
}

cw_Car.prototype.draw = function() {
  drawObject(this.chassis);
  
  for (var i = 0; i < this.wheels.length; i++){
    drawObject(this.wheels[i]);
  }
}

cw_Car.prototype.kill = function() {
  world.DestroyBody(this.chassis);
  
  for (var i = 0; i < this.wheels.length; i++){
    world.DestroyBody(this.wheels[i]);
  }
  this.alive = false;
}

cw_Car.prototype.checkDeath = function() {
  // check health
  var position = this.getPosition();
  if(position .y < -20.0) {
    return true
  }
  if(position.x > this.maxPosition + 0.02) {
    this.health = max_car_health;
    this.maxPosition = position.x;
  } else {
    if(position.x > this.maxPosition) {
      this.maxPosition = position.x;
    }
    if(Math.abs(this.chassis.GetLinearVelocity().x) < 0.001) {
      this.health -= 5;
    }
    this.health--;
    if(this.health <= 0) {
      return true;
    }
  }

  return false
}

function cw_createChassisPart(body, vertex1, vertex2, density) {
  var vertex_list = new Array();
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0,0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = density;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list,3);

  body.CreateFixture(fix_def);
}

function cw_createChassis(vertex_list, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 2.0);

  var body = world.CreateBody(body_def);

  cw_createChassisPart(body, vertex_list[0],vertex_list[1], density);
  cw_createChassisPart(body, vertex_list[1],vertex_list[2], density);
  cw_createChassisPart(body, vertex_list[2],vertex_list[3], density);
  cw_createChassisPart(body, vertex_list[3],vertex_list[4], density);
  cw_createChassisPart(body, vertex_list[4],vertex_list[5], density);
  cw_createChassisPart(body, vertex_list[5],vertex_list[6], density);
  cw_createChassisPart(body, vertex_list[6],vertex_list[7], density);
  cw_createChassisPart(body, vertex_list[7],vertex_list[0], density);

  body.vertex_list = vertex_list;

  return body;
}

function cw_createWheel(radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

function cw_createRandomCar() {
  var v = [];
  var car_def = new Object();
  
  car_def.wheelCount = 2; 
  
  car_def.wheel_radius = [];
  car_def.wheel_density = [];
  car_def.wheel_vertex = [];
  for (var i = 0; i < car_def.wheelCount; i++){
    car_def.wheel_radius[i] = Math.random()*wheelMaxRadius+wheelMinRadius;
    car_def.wheel_density[i] = Math.random()*wheelMaxDensity+wheelMinDensity;
  }
  
  car_def.chassis_density = Math.random()*chassisMaxDensity+chassisMinDensity

  car_def.vertex_list = new Array();
  car_def.vertex_list.push(new b2Vec2(Math.random()*chassisMaxAxis + chassisMinAxis,0));
  car_def.vertex_list.push(new b2Vec2(Math.random()*chassisMaxAxis + chassisMinAxis,Math.random()*chassisMaxAxis + chassisMinAxis));
  car_def.vertex_list.push(new b2Vec2(0,Math.random()*chassisMaxAxis + chassisMinAxis));
  car_def.vertex_list.push(new b2Vec2(-Math.random()*chassisMaxAxis - chassisMinAxis,Math.random()*chassisMaxAxis + chassisMinAxis));
  car_def.vertex_list.push(new b2Vec2(-Math.random()*chassisMaxAxis - chassisMinAxis,0));
  car_def.vertex_list.push(new b2Vec2(-Math.random()*chassisMaxAxis - chassisMinAxis,-Math.random()*chassisMaxAxis - chassisMinAxis));
  car_def.vertex_list.push(new b2Vec2(0,-Math.random()*chassisMaxAxis - chassisMinAxis));
  car_def.vertex_list.push(new b2Vec2(Math.random()*chassisMaxAxis + chassisMinAxis,-Math.random()*chassisMaxAxis - chassisMinAxis));

  var left = [];
  for (var i = 0; i < 8; i++){
    left.push(i);
  }
  for (var i = 0; i < car_def.wheelCount; i++){
    var indexOfNext = Math.floor(Math.random()*left.length);
    car_def.wheel_vertex[i] = left[indexOfNext];
    left.splice(indexOfNext, 1);
  }

  return car_def;
}

/* === END Car ============================================================= */
/* ========================================================================= */


/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {
  cw_materializeGeneration();

}

function cw_materializeGeneration() {
  cw_carArray = new Array();
  for(var k = 0; k < generationSize; k++) {
    cw_carArray.push(new cw_Car(cw_carGeneration[k]));
  }
}

function cw_nextGeneration() {
  var newGeneration = new Array();
  var newborn;
  cw_getChampions();
  cw_topScores.push({i:gen_counter,v:cw_carScores[0].v,x:cw_carScores[0].x,y:cw_carScores[0].y,y2:cw_carScores[0].y2});
  plot_graphs();
  for(var k = 0; k < gen_champions; k++) {
    cw_carScores[k].car_def.is_elite = true;
    cw_carScores[k].car_def.index = k;
    newGeneration.push(cw_carScores[k].car_def);
  }
  for(k = gen_champions; k < generationSize; k++) {
    var parent1 = cw_getParents();
    var parent2 = parent1;
    while(parent2 == parent1) {
      parent2 = cw_getParents();
    }
    newborn = cw_makeChild(cw_carScores[parent1].car_def,
                           cw_carScores[parent2].car_def);
    newborn = cw_mutate(newborn);
    newborn.is_elite = false;
    newborn.index = k;
    newGeneration.push(newborn);
  }
  cw_carScores = new Array();
  cw_carGeneration = newGeneration;
  gen_counter++;
  cw_materializeGeneration();
  cw_deadCars = 0;
  leaderPosition = new Object();
  leaderPosition.x = 0;
  leaderPosition.y = 0;
  document.getElementById("generation").innerHTML = "generation "+gen_counter;
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML = "cars alive: "+generationSize;
}

function cw_getChampions() {
  var ret = new Array();
  cw_carScores.sort(function(a,b) {if(a.v > b.v) {return -1} else {return 1}});
  for(var k = 0; k < generationSize; k++) {
    ret.push(cw_carScores[k].i);
  }
  return ret;
}

function cw_getParents() {
    var r = Math.random();
    if (r == 0)
        return 0;
    return Math.floor(-Math.log(r) * generationSize) % generationSize;
}

function cw_makeChild(car_def1, car_def2) {
  var newCarDef = new Object();
  swapPoint1 = Math.round(Math.random()*(nAttributes-1));
  swapPoint2 = swapPoint1;
  while(swapPoint2 == swapPoint1) {
    swapPoint2 = Math.round(Math.random()*(nAttributes-1));
  }
  var parents = [car_def1, car_def2];
  var curparent = 0;
  var wheelParent = 0;
  
  var variateWheelParents = parents[0].wheelCount == parents[1].wheelCount;
  
  if (!variateWheelParents){
    wheelParent = Math.floor(Math.random() * 2);
  }
  
  newCarDef.wheelCount = parents[wheelParent].wheelCount;
  
  newCarDef.wheel_radius = [];
  for (var i = 0; i < newCarDef.wheelCount; i++){
    if (variateWheelParents){
      curparent = cw_chooseParent(curparent,i);
    } else {
      curparent = wheelParent;
    }
    newCarDef.wheel_radius[i] = parents[curparent].wheel_radius[i];  
  }

  newCarDef.wheel_vertex = [];
  for (var i = 0; i < newCarDef.wheelCount; i++){
    if (variateWheelParents){
      curparent = cw_chooseParent(curparent, i + 2);
    } else {
      curparent = wheelParent;
    }
    newCarDef.wheel_vertex[i] = parents[curparent].wheel_vertex[i];
  }
  
  newCarDef.wheel_density = [];
  for (var i = 0; i < newCarDef.wheelCount; i++){
    if (variateWheelParents){
      curparent = cw_chooseParent(curparent,i + 12);
    } else {
      curparent = wheelParent;
    }
    newCarDef.wheel_density[i] = parents[curparent].wheel_density[i];  
  }

  newCarDef.vertex_list = new Array();
  curparent = cw_chooseParent(curparent,4);
  newCarDef.vertex_list[0] = parents[curparent].vertex_list[0];
  curparent = cw_chooseParent(curparent,5);
  newCarDef.vertex_list[1] = parents[curparent].vertex_list[1];
  curparent = cw_chooseParent(curparent,6);
  newCarDef.vertex_list[2] = parents[curparent].vertex_list[2];
  curparent = cw_chooseParent(curparent,7);
  newCarDef.vertex_list[3] = parents[curparent].vertex_list[3];
  curparent = cw_chooseParent(curparent,8);
  newCarDef.vertex_list[4] = parents[curparent].vertex_list[4];
  curparent = cw_chooseParent(curparent,9);
  newCarDef.vertex_list[5] = parents[curparent].vertex_list[5];
  curparent = cw_chooseParent(curparent,10);
  newCarDef.vertex_list[6] = parents[curparent].vertex_list[6];
  curparent = cw_chooseParent(curparent,11);
  newCarDef.vertex_list[7] = parents[curparent].vertex_list[7];

  curparent = cw_chooseParent(curparent,14);
  newCarDef.chassis_density = parents[curparent].chassis_density;
  return newCarDef;
}


function cw_mutate1(old, min, range) {
    var span = range * mutation_range;
    var base = old - 0.5 * span;
    if (base < min)
        base = min;
    if (base > min + (range - span))
        base = min + (range - span);
    return base + span * Math.random();
}

function cw_mutatev(car_def, n, xfact, yfact) {
    if (Math.random() >= gen_mutation)
        return;

    var v = car_def.vertex_list[n];
    var x = 0;
    var y = 0;
    if (xfact != 0)
        x = xfact * cw_mutate1(xfact * v.x, chassisMinAxis, chassisMaxAxis);
    if (yfact != 0)
        y = yfact * cw_mutate1(yfact * v.y, chassisMinAxis, chassisMaxAxis);
    car_def.vertex_list.splice(n, 1, new b2Vec2(x, y));
}


function cw_mutate(car_def) {
  for (var i = 0; i < car_def.wheelCount; i++){
    if(Math.random() < gen_mutation){
      car_def.wheel_radius[i] = cw_mutate1(car_def.wheel_radius[i], wheelMinRadius, wheelMaxRadius);
    }
  }
  
  var wheel_m_rate = mutation_range < gen_mutation ? mutation_range : gen_mutation;
  
  for (var i = 0; i < car_def.wheelCount; i++){
    if(Math.random() < wheel_m_rate){
      car_def.wheel_vertex[i] = Math.floor(Math.random()*8)%8;
    }
  }
  
  for (var i = 0; i < car_def.wheelCount; i++){
    if(Math.random() < gen_mutation){
      car_def.wheel_density[i] = cw_mutate1(car_def.wheel_density[i], wheelMinDensity, wheelMaxDensity);
    }
  }
  
  if(Math.random() < gen_mutation){
    car_def.chassis_density = cw_mutate1(car_def.chassis_density, chassisMinDensity, chassisMaxDensity);
  }

  cw_mutatev(car_def, 0, 1, 0);
  cw_mutatev(car_def, 1, 1, 1);
  cw_mutatev(car_def, 2, 0, 1);
  cw_mutatev(car_def, 3, -1, 1);
  cw_mutatev(car_def, 4, -1, 0);
  cw_mutatev(car_def, 5, -1, -1);
  cw_mutatev(car_def, 6, 0, -1);
  cw_mutatev(car_def, 7, 1, -1);

  return car_def;
}

function cw_chooseParent(curparent, attributeIndex) {
  var ret;
  if((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
    if(curparent == 1) {
      ret = 0;
    } else {
      ret = 1;
    }
  } else {
    ret = curparent;
  }
  return ret;
}

function cw_setMutation(mutation) {
  gen_mutation = parseFloat(mutation);
}

function cw_setMutationRange(range) {
  mutation_range = parseFloat(range);
}

function cw_setMutableFloor(choice) {
  mutable_floor = (choice==1);
}

function cw_setGravity(choice) {
  gravity = new b2Vec2(0.0, -parseFloat(choice));
  // CHECK GRAVITY CHANGES
  if (world.GetGravity().y != gravity.y) {
    world.SetGravity(gravity);
  }
}

function cw_setEliteSize(clones) {
  gen_champions = parseInt(clones, 10);
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(400, 200);
  ctx.scale(1.5*zoom, -zoom);
  cw_drawFloor(floorBody);
  //cw_drawFloor(boxBody);
  cw_drawCar(carBody);
  ctx.restore();
}

function cw_minimapCamera(x, y) {
  minimapcamera.left = Math.round((2+camera_x) * minimapscale) + "px";
  minimapcamera.top = Math.round((31-camera_y) * minimapscale) + "px";
}

function cw_setCameraTarget(k) {
  camera_target = k;
}

function cw_setCameraPosition() {
  if(camera_target >= 0) {
    var cameraTargetPosition = cw_carArray[camera_target].getPosition();
  } else {
    var cameraTargetPosition = leaderPosition;
  }
  var diff_y = camera_y - cameraTargetPosition.y;
  var diff_x = camera_x - cameraTargetPosition.x;
  camera_y -= cameraspeed * diff_y;
  camera_x -= cameraspeed * diff_x;
  cw_minimapCamera(camera_x, camera_y);
}

function cw_drawGhostReplay() {
  carPosition = ghost_get_position(ghost);
  camera_x = carPosition.x;
  camera_y = carPosition.y;
  cw_minimapCamera(camera_x, camera_y);
  showDistance(Math.round(carPosition.x*100)/100, Math.round(carPosition.y*100)/100);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(200-(carPosition.x*zoom), 200+(carPosition.y*zoom));
  ctx.scale(zoom, -zoom);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  cw_drawFloor();
  ctx.restore();
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

function toggleDisplay() {
  if(cw_paused) {
    return;
  }
  canvas.width = canvas.width;
  if(doDraw) {
    doDraw = false;
    cw_stopSimulation();
    cw_runningInterval = setInterval(function() {
      var time = performance.now() + (1000 / screenfps);
      while (time > performance.now()) {
        simulationStep();
      }
    }, 1);
  } else {
    doDraw = true;
    clearInterval(cw_runningInterval);
    cw_startSimulation();
  }
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

function cw_drawMiniMap() {
  var last_tile = null;
  var tile_position = new b2Vec2(-5,0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#000";
  minimapctx.beginPath();
  minimapctx.moveTo(0,35 * minimapscale);
  for(var k = 0; k < cw_floorTiles.length; k++) {
    last_tile = cw_floorTiles[k];
    last_fixture = last_tile.GetFixtureList();
    last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
    minimapctx.lineTo((tile_position.x + 5) * minimapscale, (-tile_position.y + 35) * minimapscale);
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */


function simulationStep() {
  if (curGameState.simulationAlive && curGameState.simulationAlive()) {
    forceSimulationStep();
  }
}

function forceSimulationStep() {
  world.Step(1/box2dfps, 20, 20);
   if (curGameState.afterSimulationStep) {
    curGameState.afterSimulationStep()
  }
}

function cw_findLeader() {
  var lead = 0;
  for(var k = 0; k < cw_carArray.length; k++) {
    if(!cw_carArray[k].alive) {
      continue;
    }
    position = cw_carArray[k].getPosition();
    if(position.x > lead) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
  }
}

function cw_newRound() {
  if (mutable_floor) {
    // GHOST DISABLED
    ghost = null;
    floorseed = Math.seedrandom();

    world = new b2World(gravity, doSleep);
    cw_createFloor();
    cw_drawMiniMap();
  } else {
    // RE-ENABLE GHOST
    ghost_reset_ghost(ghost);
  }

  cw_nextGeneration();
  camera_x = camera_y = 0;
  cw_setCameraTarget(-1);
}

function cw_startSimulation() {
  cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000/screenfps));
}

function cw_stopSimulation() {
  clearInterval(cw_runningInterval);
  clearInterval(cw_drawInterval);
}

function cw_kill() {
  var avgspeed = (myCar.maxPosition / myCar.frames) * box2dfps;
  var position = myCar.maxPosition;
  var score = position + avgspeed;
  document.getElementById("cars").innerHTML += Math.round(position*100)/100 + "m + " +" "+Math.round(avgspeed*100)/100+" m/s = "+ Math.round(score*100)/100 +"pts<br />";
  ghost_compare_to_replay(replay, ghost, score);
  cw_carScores.push({ i:current_car_index, v:score, s: avgspeed, x:position, y:myCar.maxPositiony, y2:myCar.minPositiony });
  current_car_index++;
  cw_killCar();
  if(current_car_index >= generationSize) {
    cw_nextGeneration();
    current_car_index = 0;
  }
  myCar = cw_createNextCar();
  last_drawn_tile = 0;
}

function cw_resetPopulation() {
  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML = "";
  document.getElementById("topscores").innerHTML = "";
  cw_clearGraphics();
  cw_carArray = new Array();
  cw_carGeneration = new Array();
  cw_carScores = new Array();
  cw_topScores = new Array();
  cw_graphTop = new Array();
  cw_graphElite = new Array();
  cw_graphAverage = new Array();
  lastmax = 0;
  lastaverage = 0;
  lasteliteaverage = 0;
  swapPoint1 = 0;
  swapPoint2 = 0;
  cw_generationZero();
}

function cw_resetWorld() {
  doDraw = true;
  cw_stopSimulation();
  for (b = world.m_bodyList; b; b = b.m_next) {
    world.DestroyBody(b);
  }
  floorseed = document.getElementById("newseed").value;
  Math.seedrandom(floorseed);
  cw_createFloor();
  cw_drawMiniMap();
  Math.seedrandom();
  cw_resetPopulation();
  cw_startSimulation();
}

function cw_confirmResetWorld() {
  if(confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

// ghost replay stuff

function cw_pauseSimulation() {
  cw_paused = true;
  clearInterval(cw_runningInterval);
  clearInterval(cw_drawInterval);
  old_last_drawn_tile = last_drawn_tile;
  last_drawn_tile = 0;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  last_drawn_tile = old_last_drawn_tile;
  cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000/screenfps));
}

function cw_startGhostReplay() {
  if(!doDraw) {
    toggleDisplay();
  }
  cw_pauseSimulation();
  cw_ghostReplayInterval = setInterval(cw_drawGhostReplay,Math.round(1000/screenfps));
}

function cw_stopGhostReplay() {
  clearInterval(cw_ghostReplayInterval);
  cw_ghostReplayInterval = null;
  cw_findLeader();
  camera_x = leaderPosition.x;
  camera_y = leaderPosition.y;
  cw_resumeSimulation();
}

function cw_toggleGhostReplay(button) {
  if(cw_ghostReplayInterval == null) {
    cw_startGhostReplay();
    button.value = "Resume simulation";
  } else {
    cw_stopGhostReplay();
    button.value = "View top replay";
  }
}
// ghost replay stuff END

// initial stuff, only called once (hopefully)
function cw_init() {
  var endpoint = window.location.protocol + "//" + window.location.hostname + ":3000";
  alert(endpoint);
  socket = io(endpoint);
  floorseed = Math.seedrandom();
  world = new b2World(gravity, doSleep);
  floorBody = cw_createFloor();

    changeToGameState(gameStates.explanation);
$(document.body).keydown(function(event) {
  if (curGameState.onKeydown) {
    curGameState.onKeydown(event)
  };
  return false;
});

  cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));
  cw_drawInterval    = setInterval(cw_drawScreen,  Math.round(1000/screenfps));
  
}

function relMouseCoords(event){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;ne
    var currentElement = this;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return {x:canvasX, y:canvasY}
}
HTMLDivElement.prototype.relMouseCoords = relMouseCoords;

cw_init();


