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

function seedCar(seed) {
  var backup = Math.random;
  Math.seedrandom(seed);
  var carDef = createRandomCar();
  Math.random = backup;
  return varDef
}

function createRandomCar() {
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

module.exports.seedCar = seedCar;