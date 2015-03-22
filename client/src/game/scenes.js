game.module(
	'game.scenes'
)
.body(function() {
	
game.createScene('Main', {
	backgroundColor: 0xffffff,
    init: function() {
    	var text = new game.Text('This is a text test\nwith two lines', {font: '45px Arial'});
    	text.position.set(300, 500);
    	this.stage.addChild(text);

		var graphics = new game.Graphics();
		graphics.beginFill("red");
		graphics.lineStyle(10, "black");
		graphics.moveTo(100, 100);
		graphics.lineTo(200, 200);
		graphics.endFill();
		this.stage.addChild(graphics);
    },
    keydown: function(key) {
        if (key === 'SPACE') {
            game.system.setScene('Other');
        }
    },
    mousedown: function() {
    	game.system.setScene('Other');
	}
});

game.createScene('Other', {
	backgroundColor: 0xffffff,
	init: function() {
		var text = new game.Text('Other scene', {font: '45px Arial'});
    	text.position.set(300, 500);
    	this.stage.addChild(text);
	},
	keydown: function(key) {
        if (key === 'SPACE') {
            game.system.setScene('Main');
        }
    },
    mousedown: function() {
    	game.system.setScene('Main');
    }
});

});
