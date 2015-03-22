var fs = require('fs');

eval(fs.readFileSync(__dirname + '/lib/seedrandom.js','utf8'));
eval(fs.readFileSync(__dirname + '/lib/box2d.js','utf8'));

var wheelMaxRadius = 0.5;
var wheelMinRadius = 0.2;
var wheelMaxDensity = 100;
var wheelMinDensity = 40;

var chassisMaxAxis = 1.1;
var chassisMinAxis = 0.1;
var chassisMinDensity = 30;
var chassisMaxDensity = 300;

var gravity = new b2Vec2(0.0, -9.81);
var doSleep = true;

function newSimulation(fps) {
  var world = new b2World(gravity, doSleep);
  return {
    createFloor: function() {
       var floorBody = createFloor(world);
       return floorBody
    },
    step: function () {
      world.Step(1/fps, 20, 20);
    },
    seedCar: function(seed) {
      var carDef = seedCar(seed);
      var carBody = new cw_Car(carDef, world);
      return carBody;
    }
  }
}

function createFloor(world) {
  var floorPosition = new b2Vec2(-2,-2);
  var bodyDef = new b2BodyDef();
  bodyDef.position.Set(floorPosition.x, floorPosition.y)
  var body = world.CreateBody(bodyDef);
  var fixDef = new b2FixtureDef();
  fixDef.shape = new b2PolygonShape();
   
  var coords = new Array();
  coords.push(new b2Vec2(0,0));
  coords.push(new b2Vec2(0,-0.15));
  coords.push(new b2Vec2(4,-0.15));
  coords.push(new b2Vec2(4,0));

  fixDef.shape.SetAsArray(coords);

  body.CreateFixture(fixDef);
   
  return body
}

function seedCar(seed) {
  var backup = Math.random;
  Math.seedrandom(seed);
  var carDef = createRandomCarDef();
  Math.random = backup;
  return carDef
}

function createRandomCarDef() {
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

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function() {
  this.__constructor.apply(this, arguments)
}

cw_Car.prototype.chassis = null;

cw_Car.prototype.wheels = [];

cw_Car.prototype.__constructor = function(car_def, world) {
  this.velocityIndex = 0;
  this.health = max_car_health;
  this.maxPosition = 0;
  this.maxPositiony = 0;
  this.minPositiony = 0;
  this.frames = 0;
  this.car_def = car_def
  this.alive = true;
  this.is_elite = car_def.is_elite;
  this.world = world;
 
  this.chassis = cw_createChassis(car_def.vertex_list, car_def.chassis_density, this.world);
  
  this.wheels = [];
  for (var i = 0; i < car_def.wheelCount; i++){
    this.wheels[i] = cw_createWheel(car_def.wheel_radius[i], car_def.wheel_density[i], this.world);
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
    var joint = this.world.CreateJoint(joint_def);
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
  this.world.DestroyBody(this.chassis);
  
  for (var i = 0; i < this.wheels.length; i++){
    this.world.DestroyBody(this.wheels[i]);
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

  cw_Car.prototype.resultPosition = function() {
    if (carBody.getPosition().y < -4.0) {
      if (carBody.getPosition().x < -1.0) {
          return 'left';
      }
      if (carBody.getPosition().x > 1.0) {
       return 'right';
      }
    }
    return 'platform';
  }
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

function cw_createChassis(vertex_list, density, world) {
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

function cw_createWheel(radius, density, world) {
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

module.exports = newSimulation;

