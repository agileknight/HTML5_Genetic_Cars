/* ========================================================================= */
/* ==== Floor ============================================================== */

function cw_createFloor() {
  	var floorPosition = new b2Vec2(-2,-2);
	bodyDef = new b2BodyDef();
	bodyDef.position.Set(floorPosition.x, floorPosition.y)
	 var body = world.CreateBody(bodyDef);
     fixDef = new b2FixtureDef();
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


function cw_createFloorTile(position, angle) {
	
	
  body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0,0));
  coords.push(new b2Vec2(0,-groundPieceHeight));
  coords.push(new b2Vec2(groundPieceWidth,-groundPieceHeight));
  coords.push(new b2Vec2(groundPieceWidth,0));

  var center = new b2Vec2(0,0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  var newcoords = new Array();
  for(var k = 0; k < coords.length; k++) {
    nc = new Object();
    nc.x = Math.cos(angle)*(coords[k].x - center.x) - Math.sin(angle)*(coords[k].y - center.y) + center.x;
    nc.y = Math.sin(angle)*(coords[k].x - center.x) + Math.cos(angle)*(coords[k].y - center.y) + center.y;
    newcoords.push(nc);
  }
  return newcoords;
}

/* ==== END Floor ========================================================== */
/* ========================================================================= */


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
