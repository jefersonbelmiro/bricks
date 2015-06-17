;(function(exports) {

    var Preloader = function(game) {
        this.game = game;
    }    

    Preloader.prototype = {

        preload: function(){

            bck = this.add.sprite(this.world.centerX, this.world.centerY, 'preload-background');
            bck.anchor.setTo(0.5,0.5);
            bck.scale.setTo(0.5,0.5);
            preloadBar = this.add.sprite(this.world.centerX, this.world.centerY, 'preload-bar');
            preloadBar.anchor.setTo(0,0.5);
            preloadBar.scale.setTo(0.5,1);
            preloadBar.x = this.world.centerX - preloadBar.width/2;

            this.load.setPreloadSprite(preloadBar);

            this.load.atlasJSONHash('bricks', 'src/img/bricks.png', 'src/json/bricks.json');
            this.load.atlasJSONHash('buttons', 'src/img/buttons.png', 'src/json/buttons.json');

            this.load.image('btn-pause', 'src/img/btn-pause.png');
            this.load.image('bomb', 'src/img/bomb.png');
            this.load.image('clock', 'src/img/clock.png');
            this.load.image('double', 'src/img/double.png');
            this.load.image('time-bar', 'src/img/health-bar.png');

            this.load.bitmapFont('font', 'src/img/font.png', 'src/xml/font.xml');
            this.load.bitmapFont('font-big', 'src/img/font-big.png', 'src/xml/font-big.xml');
        },

        create: function(){
            this.state.start('menu');
        }

    } 

    exports.Preloader = Preloader;

})(this);
