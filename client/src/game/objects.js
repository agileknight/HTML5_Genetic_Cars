game.module(
    'game.objects'
)
.body(function() {

	/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 1].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
}

	var zoom = 100;

	var chassisMaxAxis = 1.1;
var chassisMinAxis = 0.1;
var chassisMinDensity = 30;
var chassisMaxDensity = 300;

	var wheelMaxRadius = 0.5;
var wheelMinRadius = 0.2;
var wheelMaxDensity = 100;
var wheelMinDensity = 40;

	function cw_drawFloor(floorBody, ctx) {
  
  ctx.lineStyle(1, 0x000000, 1)
  ctx.beginFill(0x666666);

  for (var f = floorBody.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      cw_drawVirtualPoly(floorBody, s.m_vertices, s.m_vertexCount, ctx);
  }
  ctx.endFill();
}

function cw_drawCar(carBody, ctx) {
  if (!carBody) {
    return
  }
    var myCar = carBody
    if(!myCar.alive) {
      return;
    }
    var myCarPos = myCar.getPosition();

    ctx.lineStyle(1, 0x444444, 1);

    for (var i = 0; i < myCar.wheels.length; i++){
      var b = myCar.wheels[i];
      for (f = b.GetFixtureList(); f; f = f.m_next) {
        var s = f.GetShape();
        var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelMaxDensity);
        var rgbcolor = [color/255, color/255, color/255];
        cw_drawCircle(b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor, ctx);
      }
    }
    
    var densitycolor = Math.round(100 - (70 * ((myCar.car_def.chassis_density - chassisMinDensity) / chassisMaxDensity)));
    ctx.lineStyle(1, 0xcc4444, 1);
    var rgbcolor = hslToRgb(0,0.5,densitycolor/100);
    ctx.beginFill(game.PIXI.rgb2hex(rgbcolor));
    var b = myCar.chassis;
    for (f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      cw_drawVirtualPoly(b, s.m_vertices, s.m_vertexCount, ctx);
    }
    ctx.endFill();
}

function cw_drawVirtualPoly(body, vtx, n_vtx, ctx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x*zoom, p0.y*zoom);
  for (var i = 1; i < n_vtx; i++) {
    var p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x*zoom, p.y*zoom);
  }
  ctx.lineTo(p0.x*zoom, p0.y*zoom);
}

function cw_drawCircle(body, center, radius, angle, color, ctx) {
  var p = body.GetWorldPoint(center);
  ctx.beginFill(game.PIXI.rgb2hex(color));
  ctx.drawCircle(p.x*zoom, p.y*zoom, radius*zoom);
  ctx.endFill();

  ctx.moveTo(p.x*zoom, p.y*zoom);
  ctx.lineTo((p.x + radius*Math.cos(angle))*zoom, (p.y + radius*Math.sin(angle))*zoom);
}
    
game.createClass('UserSimulation', {
    init: function() {
    	this.graphics = new game.Graphics();
  		this.graphics.position = new game.Point(400, 400);
  		this.graphics.scale = new game.Point(1, -1);
    	this.graphics.addTo(game.scene.stage);
    },
    update: function() {
    	var graphics = this.graphics;
    	graphics.clear();
    	cw_drawFloor(game.floorBody, graphics);
    	cw_drawCar(game.carBody, graphics);
    }
});

});
