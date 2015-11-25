;(function(exports) {

    var game;

    function createRect(width, height, color) {

        var bmd = game.add.bitmapData(width, height);

        bmd.ctx.beginPath();
        bmd.ctx.rect(0, 0, width, height);
        bmd.ctx.fillStyle = color;
        bmd.ctx.fill();
        bmd.ctx.closePath();
        return bmd;
    }

    var Menu = function(_game) {
        this.game = _game;
        game = _game;
    }    

    Menu.prototype = {

        create: function() {

            var textName = game.add.bitmapText(game.world.centerX, game.world.centerY, 'font', 'BRICKS', 106);
            textName.anchor.setTo(0.5); 
            textName.y -= textName.height * 2;

            var textPlay = game.add.bitmapText(0, 0, 'font', 'START GAME', 30);
            textPlay.anchor.setTo(0.5);
            textPlay.alpha = 0.7;

            var rect = game.add.sprite(
                game.world.centerX,
                textName.y + textName.height + 100,
                createRect(textPlay.width + 25, textPlay.height + 18, '#444')
            );
            rect.anchor.setTo(0.5);
            rect.addChild(textPlay);
            
            rect.inputEnabled = true;
            rect.events.onInputDown.add(function() {
                this.state.start('game'); 
            }, this);
            
            var best = localStorage.getItem('pixel_bricks_best') || 0;  
            var textScore = game.add.bitmapText(game.world.centerX, game.height, 'font', 'HIGHSCORE: ' + best, 33);
            textScore.anchor.setTo(0.5);
            textScore.y -= textScore.height;
        },

    } 

    exports.Menu = Menu;

})(this);
