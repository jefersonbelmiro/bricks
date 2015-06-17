;(function(global) {

    var 
        fpsText
    ;

    var Play = function(game) {
        this.game = game;
    }    

    play.prototype = {

        create: function() {

            currentstate = STATES.PLAY;

            this.game.time.advancedTiming = true;
            fpsText = this.game.add.text(0, 5, '00', {font: '16px Arial', fill: '#333'});
            fpsText.x = this.game.width - fpsText.width - 5;

            Board.create();
        },

        update : function() { 
            fpsText.setText(this.time.fps);
        },

        render : function() {

        },

    } 

})(this);
