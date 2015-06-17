;(function(global) {

    var 
        game, entities, bricksGroup, bricks = {}, 
        currentstate, STATES = { PAUSED: 1, PLAY: 2, SCORE: 3, GAME_OVER: 4 }, 
        fpsText, scoreText,
        score = 0, best = 0, 
        sounds,
        btnPause,
        timeBar, countDownTimer, countDown
    ;

    function createBoard() {

        bricksGroup = game.add.group();
        bricksGroup.x = Config.board.x;
        bricksGroup.y = Config.board.y;

        for (var row = 0; row < Config.board.rows; row++) {

            bricks[row] = {};

            for (var col = 0; col < Config.board.cols; col++) {
                var brick = createbrick(row, col);
            }
        }

        entities.add(bricksGroup);
        createTimeBar();
    } 

    function createTimeBar() {

        countDown = Config.timeBar.countDown;

        var updateTime = 1/15;
        var percent = updateTime / Config.timeBar.countDown * 100;
        var subTimeBar = Config.timeBar.width * percent/100;

        timeBar = game.add.tileSprite(
            Config.timeBar.x, Config.timeBar.y, Config.timeBar.width, Config.timeBar.height, 'time-bar'
        ); 

        countDownTimer = game.time.create(false);
        countDownTimer.loop(updateTime * Phaser.Timer.SECOND, function() {

            countDown -= updateTime;

            timeBar.width -= subTimeBar;

            if (countDown <= 0) {
                gameOver();
            }

        });
        countDownTimer.start(); 
        
    }

    function createbrick(row, col, revive) {

        var brick = bricksGroup.getFirstDead();
        var revive = revive || true;
        var x = col * Config.board.celWidth;
        var y = row * Config.board.celHeight;

        if (brick) {

            if (revive) {
                brick.revive();
            }
            brick.x = x;
            brick.y = y;
        } 

        if (!brick) {

            brick = bricksGroup.create(x, y, 'bricks');
            brick.inputEnabled = true;
            brick.events.onInputDown.add(select, game);
        }

        setRandomFrame(brick);

        brick.row = row;
        brick.col = col;

        bricks[row][col] = brick;

        return brick;
    }

    function setRandomFrame(brick) {
        brick.frame = game.rnd.integerInRange(0, 4);
    }

    function select(brick, input) {

        var x = brick.col * Config.board.celWidth;
        var y = brick.row * Config.board.celHeight;

        animation(brick, {x: 0, y: 0});
        animation(brick, {x: x, y: y});

        // brick.frame += 5;
    }

    function gameOver() {
        
        console.log('gameover()');
        currentstate = STATES.GAMEOVER;
        countDownTimer.pause();
        frozenBoard();
    }

    function pause() {

        console.log('paused()');
        currentstate = STATES.PAUSED;
        countDownTimer.pause();
        frozenBoard(); 
    }

    function resume() {

        console.log('resume()');
        currentstate = STATES.RUNNING;
        countDownTimer.resume();
        unfrozenBoard(); 
    }

    function frozenBoard() {
        bricksGroup.forEachAlive(function(brick) {
            brick.inputEnabled = false;
        });
    }

    function unfrozenBoard() {
        bricksGroup.forEachAlive(function(brick) {
            brick.inputEnabled = true;
        });
    }

    /**
     * process
     */
    ;(function(global) {

        global.process = {
            tick : 0,
            nextTick : function(fn, args) {
                return setTimeout(function() {
                    return fn.apply(global, args);
                }, this.tick);
            }
        }

    })(this);

    /**
     * animation
     */
    ;(function(global) {

        function execute(brick) {

            if (brick.tweens.length == 0 || (brick.tween && brick.tween.isRunning)) {
                return false;
            }

            var anim = brick.tweens.shift();
            brick.tween = game.add.tween(brick);
            brick.tween.to(anim.to, anim.time, anim.ease);
            brick.tween.onComplete.add(function() {

                if (anim.done) {
                    anim.done();
                }

                return process.nextTick(execute, [brick]);
            });
            brick.tween.start();
        }

        function animation(brick, to, time, ease) {

            var anim = {
                to : to,
                time: time || 200,
                ease : ease || Phaser.Easing.Linear.None,
            };

            brick.tweens = brick.tweens || [];
            brick.tweens.push(anim);
            process.nextTick(execute, [brick]);
        }

        global.animation = animation;

    })(this);

    var Game = function(_game) {
        game = _game;
    }    

    Game.prototype = {

        create: function() {

            currentstate = STATES.PAUSED;

            game.time.advancedTiming = true;
            fpsText = game.add.text(0, 5, '00', {font: '16px Arial', fill: '#333'});
            fpsText.x = game.width - fpsText.width - 5;

            entities = game.add.group();

            createBoard();

            score = 20.233;
            scoreText = game.add.bitmapText(Config.board.x, 10, 'font', String(score), 40);
            btnPause = game.add.button(game.width - game.cache.getImage('btn-pause').width, 5, 'btn-pause', pause);
            btnPause.x -= btnPause.width - 15;
            btnPause.scale.setTo(1.5);

            // scoreText = game.add.bitmapText(game.width, 5, 'font', String(score), 33);
            // scoreText.x -= scoreText.width + 10;
            // btnPause = game.add.button(5, 5, 'btn-pause', pause);
        },

        update : function() { 
            fpsText.setText(this.time.fps);
        },

        render : function() {

        },

    } 

    global.Game = Game;

})(this);
