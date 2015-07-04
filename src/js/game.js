// ;(function(global) {

    global = this;
    'use strict';

    var 
        game, 
        entities, bricksGroup, scoreNumberGroup, bombGroup,
        bricks = {}, selectedBrick,  
        currentstate, STATES = { PAUSED: 'paused', PLAY: 'play', SCORE: 'score', GAME_OVER: 'game_over' }, 
        fpsText, scoreText,
        score = 0, best = 0, 
        sounds,
        btnPause,
        timeBar, countDownTimer, countDown,
        pointer = { start : null, end : null } 
    ;

    function createBoard() {

        bricksGroup = game.add.group();
        scoreNumberGroup = game.add.group();
        bombGroup = game.add.group();
        
        bricksGroup.position.setTo(Config.board.x, Config.board.y);
        scoreNumberGroup.position.setTo(bricksGroup.x, bricksGroup.y);

        for (var row = 0; row < Config.board.rows; row++) {

            bricks[row] = {};

            for (var col = 0; col < Config.board.cols; col++) {
                var brick = createBrick(row, col);
            }
        }

        entities.add(bricksGroup);
        entities.add(scoreNumberGroup);
        createTimeBar();

        removeInitialMatches();
        createDropAnimationStart(); 
    } 

    function createTimeBar() {

        countDown = Config.timeBar.countDown;

        var updateTime = 1/15;
        var percent = updateTime / Config.timeBar.countDown * 100;
        var subTimeBar = Config.timeBar.width * percent/100;

        if (!timeBar) {
            timeBar = game.add.tileSprite(
                Config.timeBar.x, Config.timeBar.y, Config.timeBar.width, Config.timeBar.height, 'time-bar'
            ); 
        }

        timeBar.width = Config.timeBar.width;
        timeBar.height = Config.timeBar.height;

        if (countDownTimer) {
            return false;
        }
        countDownTimer = game.time.create(false);
        countDownTimer.loop(updateTime * Phaser.Timer.SECOND, function() {

            console.log('countDownTimer');
            countDown -= updateTime;

            timeBar.width -= subTimeBar;

            if (countDown <= 0) {
                gameOver();
                countDownTimer.pause();
            }

        });
        countDownTimer.start(); 
    }

    function createBrickBomb(row, col) {

        var brick = createBrick(row, col);
        var bomb = createBomb(0, 0);
        brick.addChild(bomb);
        brick._type = 'bomb';
        return brick;
    }

    function createBomb(x, y) {

        var bomb = bombGroup.getFirstDead();

        if (!bomb) {
            bomb = bombGroup.create(0, 0, 'bomb');
        }

        return bomb;
    }
    
    function createCircle(radius, color, borderColor) {

        var border = 5;
        var bmd = game.add.bitmapData(radius*2+border, radius*2+border);

        bmd.ctx.beginPath();
        bmd.ctx.arc(bmd.width/2, bmd.height/2, radius, 0, 2 * Math.PI, true);
        bmd.ctx.fillStyle = color;
        bmd.ctx.fill();
        if (border) {
            bmd.ctx.lineWidth = border;
            bmd.ctx.strokeStyle = borderColor;
            bmd.ctx.stroke();
        }
        return bmd;
    }

    function createRect(width, height, color) {

        var bmd = game.add.bitmapData(width, height);
         
        bmd.ctx.beginPath();
        bmd.ctx.rect(0, 0, width, height);
        bmd.ctx.fillStyle = color;
        bmd.ctx.fill();
        bmd.ctx.closePath();
        return bmd;
    }

    function createBrick(row, col) {

        var brick = bricksGroup.getFirstDead();
        var x = col * Config.board.celWidth;
        var y = row * Config.board.celHeight;

        if (brick) {

            brick.revive();
            brick.x = x;
            brick.y = y;
            brick.removeChildren();
            brick.bringToTop();
        } 

        if (!brick) {

            brick = bricksGroup.create(x, y, 'bricks');
            brick.inputEnabled = true;
            brick.events.onInputDown.add(inputDown);
            brick.bringToTop();
        }

        setRandomFrame(brick);

        brick.row = Number(row);
        brick.col = Number(col);
        brick.alpha = 1;
        brick.width = Config.brick.width;
        brick.height = Config.brick.height;

        brick.dying = false;
        brick.selectable = true;
        brick._reborn = false;
        brick._type = false;

        bricks[row][col] = brick;

        return brick;
    }

    function getBrick(row, col) {

        if (!bricks[row] || !bricks[row][col]) {
            return false;
        }

        return bricks[row][col];
    }

    function setRandomFrame(brick) {
        // brick.frame = game.rnd.integerInRange(0, 2);
        brick.frame = game.rnd.integerInRange(0, 4);
    }

    function inputDown(brick, input) {

        if (!brick.selectable) return false;

        if (selectedBrick && selectedBrick.selectable) {

            var distRow = Math.abs(selectedBrick.row - brick.row);
            var distCol = Math.abs(selectedBrick.col - brick.col);

            if (distRow <= 1 && distCol <= 1 && distCol != distRow) {

                swap(selectedBrick, brick);
                selectedBrick = false;
                return true; 
            }
        }
        
        selectedBrick = brick; 
    }
 
    function inputMove(input, x, y, fromClick) {

        if (!selectedBrick || !selectedBrick.selectable || !pointer.start) return;

        var distX = x - pointer.start.x;
        var distY = y - pointer.start.y;
        var min = 15;

        if (Math.abs(distX) <= min && Math.abs(distY) <= min) {
            return false;
        }

        var row = selectedBrick.row;
        var col = selectedBrick.col;

        if (Math.abs(distX) > Math.abs(distY)) {
            col = distX > 0 ? col + 1 : col - 1;
        } else {
            row = distY > 0 ? row + 1 : row - 1;
        }

        var brick = getBrick(row, col);

        if (!brick || !brick.selectable || brick.dying || !brick.alive) {
            return false;
        }

        swap(selectedBrick, brick);
        selectedBrick = false;
    }

    function swap(selectedBrick, brick) {

        function _swapProperties() {

            var _row = selectedBrick.row;
            var _col = selectedBrick.col;

            bricks[selectedBrick.row][selectedBrick.col] = brick;
            bricks[brick.row][brick.col] = selectedBrick;

            selectedBrick.row = brick.row;
            selectedBrick.col = brick.col;
            brick.row = _row;
            brick.col = _col;
        }

        function _getMatches() {

            var selectedBrickSameColor = getSameColor(selectedBrick);
            var brickSameColor = getSameColor(brick);
            var bricksMatch = [];

            if (selectedBrickSameColor.length >= Config.minScore || brickSameColor.length >= Config.minScore) {

                if (selectedBrickSameColor.length > Config.minScore) {
                    selectedBrick._reborn = 'bomb';
                }

                if (brickSameColor.length > Config.minScore) {
                    brick._reborn = 'bomb';
                }

                if (selectedBrickSameColor.length >= Config.minScore) {

                    bricksMatch = bricksMatch.concat(selectedBrickSameColor.matches);

                    var showNumbers = true;

                    for (var i = 0, len = selectedBrickSameColor.matches.length; i < len; i++) {
                        if (selectedBrickSameColor.matches[i]._type === 'bomb') {
                            showNumbers = false;
                        }
                    }

                    if (showNumbers) {
                        createScoreNumber(
                            (selectedBrick.col * Config.board.celWidth) + selectedBrick.width/2, 
                            (selectedBrick.row * Config.board.celHeight) + selectedBrick.height/2, 
                            selectedBrickSameColor.length * 10
                        );
                    }
                }

                if (brickSameColor.length >= Config.minScore) {

                    bricksMatch = bricksMatch.concat(brickSameColor.matches);

                    var showNumbers = true;

                    for (var i = 0, len = brickSameColor.matches.length; i < len; i++) {
                        if (brickSameColor.matches[i]._type === 'bomb') {
                            showNumbers = false;
                        }
                    }

                    if (showNumbers) {
                        createScoreNumber(
                            (brick.col * Config.board.celWidth) + brick.width/2, 
                            (brick.row * Config.board.celHeight) + brick.height/2, 
                            brickSameColor.length * 10
                        );
                    }
                }


                return bricksMatch;
            }

            return false;
        }

        function _animationInvalidMoviment() {

            sounds.moveInvalid.play();

            move(selectedBrick);
            move(brick, function() {

                _swapProperties();

                move(selectedBrick);
                move(brick);
            });
        }

        _swapProperties();

        var matches = _getMatches();

        if (!matches) {
            return _animationInvalidMoviment();
        } 

        // blockMatches(matches);

        move(selectedBrick);
        move(brick, function() {
            processMatches(matches);
        });
    }

    function move(brick, callback, time, ease) {

        brick.selectable = false;

        var x = brick.col * Config.board.celWidth;
        var y = brick.row * Config.board.celHeight;

        var time = time || 150;
        var ease = ease || Phaser.Easing.Linear.None;

        return animation(brick, { to: { x: x, y: y }, time: time, ease: ease, done : function() {
        
            brick.selectable = true;

            if (callback) {
                callback();
            }

        }});
    }

    function blockMatches(matches) {
        for (var index = 0, length = matches.length; index < length; index++) {
            matches[index].dying = true;
            matches[index].selectable = false;
        }
    }

    function removeDuplicates(bricksArray) {

        var result = [], keys = {};

        for (var index = 0, length = bricksArray.length; index < length; index++) {

            var brick = bricksArray[index];
            if (keys[brick.row] && keys[brick.row][brick.col]) {
                continue;
            }
            if (!keys[brick.row]) {
                keys[brick.row] = {};
            }
            keys[brick.row][brick.col] = true;
            result.push(brick);
        }

        return result;
    }

    function killBrick(brick, callback) {

        brick.dying = true;
        brick.selectable = false;

        var time = 100;
        var to = { 
            width: brick.width/2,
            height: brick.height/2,
            x : brick.x + (brick.width * 0.25),
            y : brick.y + (brick.height * 0.25)
        };

        if (brick._type === 'explode') {
            // to = {
            //     alpha : 0,
            // }
            // time = 1250;
        }

        animation(brick, { to: to, time: time, ease: Phaser.Easing.Linear.None, done: function() {
        
            brick.kill();
            bricks[brick.row][brick.col] = null;

            if (brick._reborn === 'bomb') {

                var brickReborn = createBrickBomb(brick.row, brick.col);
                var brickRebornAnim = game.add.tween(brickReborn.scale);

                brickReborn.scale.setTo(0.2);

                brickRebornAnim.to({x: 1, y: 1}, 300, Phaser.Easing.Bounce.Out);
                brickRebornAnim.start();
            }

            if (callback) {
                callback();
            }
        }});
    }

    function findMatches() {

        console.log('findMatches()');

        'use strict';

        if (process.queue.has('findMatches')) {
            console.error('findMatches again?');
            return [];
        }

        process.queue.add('findMatches');

        var matches = [], keys = {}, ignore = { row : [], col : [] };

        for (var row = 0; row < Config.board.rows; row++) {

            for (var col = 0; col < Config.board.cols; col++) {

                var brick = getBrick(row, col);

                var brickSameColor = getSameColor(brick);

                if (brickSameColor.matches.length < Config.minScore) {
                    continue;
                }

                for (var index = 0, length = brickSameColor.matches.length; index < length; index++) {

                    var brickMatch = brickSameColor.matches[index];

                    if (!keys[brickMatch.row]) {
                        keys[brickMatch.row] = {};
                    }

                    if (keys[brickMatch.row] && keys[brickMatch.row][brickMatch.col]) {
                        continue;
                    }

                    if (brickSameColor.matches.length > Config.minScore) {
                        brick._reborn = 'bomb';
                    }

                    keys[brickMatch.row][brickMatch.col] = true;
                    matches.push(brickMatch);
                }
            }
        }            

        process.queue.remove('findMatches');

        return matches;
    }

    function removeInitialMatches() {

        var matches = findMatches();

        if (matches.length == 0) {
            return true;
        }

        for (var index = 0, length = matches.length; index < length; index++) {
            setRandomFrame(matches[index]);
        }

        return removeInitialMatches();
    }

    function createDropAnimationStart() {
        
        var data = {};

        bricksGroup.forEachAlive(function(brick) {

            if (!data[brick.col]) {
                data[brick.col] = -(brick.col + 1 * game.rnd.integerInRange(0, brick.height * 5));
            }
            
            brick.y = data[brick.col] - (brick.row + 1 * brick.height);

            var time = 1000;
            var ease = Phaser.Easing.Bounce.Out;
            move(brick, false, time, ease);
        });
    }

    function explode(brickBomb) {

        console.log('explode()');

        var callback = false;
        var scored = 0;
        var _row = brickBomb.row, _col = brickBomb.col;

        var horizontalRect = createRect(Config.board.width, Config.brick.width * 0.7, 'rgba(255, 255, 255, 0.5)');
        var horizontalSprite = game.add.sprite(
            _col * Config.board.celWidth + bricksGroup.x, 
            _row * Config.board.celHeight + bricksGroup.y,  
            horizontalRect
        );
        horizontalSprite.width = Config.board.celWidth;  
        horizontalSprite.height = Config.board.celHeight;  

        var verticalRect = createRect(Config.brick.width * 0.7, Config.board.height, 'rgba(255, 255, 255, 0.5)');
        var verticalSprite = game.add.sprite(
            _col * Config.board.celWidth + bricksGroup.x, 
            _row * Config.board.celHeight + bricksGroup.y, 
            verticalRect
        );
        verticalSprite.width = Config.board.celWidth;  
        verticalSprite.height = Config.board.celHeight;  

        var horizontalTo = {
            width: Config.board.width,
            height: Config.brick.height,
            x : bricksGroup.x, 
            y: bricksGroup.y + (_row * Config.board.celHeight)
        };

        var verticalTo = {
            width: Config.brick.width, 
            height: Config.board.height,
            x: (_col * Config.board.celWidth),
            y: bricksGroup.y
        };

        var horizontalAnim = game.add.tween(horizontalSprite);
        var verticalAnim = game.add.tween(verticalSprite);

        horizontalAnim.to(horizontalTo, 150, Phaser.Easing.Linear.None);
        horizontalAnim.onComplete.add(function() {
            horizontalSprite.kill();
        });

        verticalAnim.to(verticalTo, 150, Phaser.Easing.Linear.None);
        verticalAnim.onComplete.add(function() {
            verticalSprite.kill();
        });

        horizontalAnim.start();
        verticalAnim.start();

        sounds.explosion.play();
        game.plugins.screenShake.shake(10);

        for (var row = 0; row < Config.board.rows; row++) {

            var brick = getBrick(row, _col);

            if (brick && !brick.dying) {

                if (brick._type === 'bomb' && brick != brickBomb) {
                    brick._type = 'explode';
                    explode(brick);
                    continue;
                } 

                scored += 10;
                brick._type = 'explode';
                killBrick(brick, callback);
            }
        }

        for (var col = 0; col < Config.board.cols; col++) {

            if (col == _col) {
                continue;
            }

            if (col == Config.board.cols - 1) {
                callback = function() {
                    unfrozenBoard();
                    drop();
                }
            }

            var brick = getBrick(_row, col);

            if (brick && !brick.dying) {

                if (brick._type === 'bomb' && brick != brickBomb) {
                    brick._type = 'explode';
                    explode(brick);
                    continue;
                } 

                scored += 10; 
                brick._type = 'explode';
                killBrick(brick, callback);
            }
        }

        createScoreNumber(
            (_col * Config.board.celWidth) + Config.brick.width/2, 
            (_row * Config.board.celHeight) + Config.brick.height/2, 
            scored
        );

        score += scored;
        updateScore();

        if (!callback) {
            return process.nextTick(drop);
        }
    } 

    function processMatches(bricksArray) {

        console.log('processMatches()');

        if (currentstate !== STATES.PLAY || bricksArray.length == 0) {
            return false;
        }

        if (process.queue.has('processMatches')) {
            console.error('processMatches again?');
            return process.nextTick(processMatches, [bricksArray]);
        } 

        process.queue.add('processMatches');

        var 
            bricksArray = removeDuplicates(bricksArray), 
            length = bricksArray.length,
            last = length - 1, 
            scored = 0
        ;

        if (length == 0) {
            return false;
        }

        frozenBoard();

        for (var index = 0; index < length; index++) {

            var brick = bricksArray[index];
            var callback = false;

            if (index == last) {
                callback = function() {
                    unfrozenBoard();
                    drop();
                };
            }

            if (brick._type === 'bomb') {
                explode(brick);
                continue;
            } 

            scored += 10;
            killBrick(brick, callback);
        }

        // countDown += length/4;
        score += scored;

        updateScore();
        sounds.score.play();

        process.queue.remove('processMatches');
    }

    function drop() {

        console.log('drop()');

        var time = 200;
        var ease = Phaser.Easing.Bounce.Out;
        var moves = [];

        console.log('drop() 1.0');
        for (var col = 0; col < Config.board.cols; col++) {

            var dropRowCount = 0;
            var dropBrick = [];

            // detect rows to drop
            for (var row = Config.board.rows - 1; row >= 0; row--) {

                var brick = getBrick(row, col);

                if (!brick || !brick.alive) {

                    dropRowCount++;
                    continue;
                }

                if (dropRowCount <= 0) {
                    continue;
                }

                brick.dropRowCount = dropRowCount;
                dropBrick.push(brick);
            }

            // drop bricks
            for (var index = 0, length = dropBrick.length; index < length; index++) {

                var brick = dropBrick[index];

                bricks[brick.row][brick.col] = null;
                brick.row += brick.dropRowCount;
                bricks[brick.row][brick.col] = brick;

                moves.push(brick);
            }

            // new bricks
            for (var index = dropRowCount - 1; index >= 0; index--) {

                var brick = createBrick(index, col);

                brick.y = (Config.board.celHeight * (4-index)) * -1;
                moves.push(brick);
            }

        }

        console.log('drop() 1.1');
        var length = moves.length, last = length - 1; 

        if (length == 0) {
            console.log('drop() 1.2');
            return false;
        }

        console.log('drop() 1.3');
        frozenBoard();
        console.log('drop() 1.4');

        for (var index = 0; index < length; index++) {

            var brick = moves[index];
            var callback = false;

            if (index == last) {
                callback = function() {
                    
                    console.log('drop() 1.6');
                    unfrozenBoard();
                    var matches = findMatches();
                    if (matches.length == 0) {
                        return process.nextTick(drop);
                    }
                    return processMatches(matches);
                }
            }

            move(brick, callback, time, ease);
        }
        console.log('drop() 1.5');
    }

    function getSameColor(brick) {

        var result = [], horizontal = [brick], vertical = [brick];

        horizontal = horizontal.concat(getSameColorByDirection(brick, 0, -1));
        horizontal = horizontal.concat(getSameColorByDirection(brick, 0, 1));

        vertical = vertical.concat(getSameColorByDirection(brick, -1, 0));
        vertical = vertical.concat(getSameColorByDirection(brick, 1, 0));

        if (horizontal.length >= Config.minScore) {
            result = result.concat(horizontal);
        }

        if (vertical.length >= Config.minScore) {
            result = result.concat(vertical);
        }

        return {
            horizontal : horizontal,
            vertical : vertical,
            matches : result,
            length : result.length
        }
    }

    function getSameColorByDirection(brick, moveRow, moveCol) {

        var result = [];
        var curRow = brick.row + moveRow;
        var curCol = brick.col + moveCol;

        if (brick.dying) {
            return result;
        }

        while (curRow >= 0 && curCol >= 0 && curRow < Config.board.rows && curCol < Config.board.cols) {

            var findBrick = getBrick(curRow, curCol);

            if (!findBrick || findBrick.frame != brick.frame || findBrick.dying) {
                break;
            } 

            result.push(findBrick);
            curRow += moveRow;
            curCol += moveCol;
        }

        return result;
    }

    function updateScore() {
        scoreText.setText(String(score));
    }

    function createScoreNumber(x, y, scored, caller) {

        var scoreNumberText = scoreNumberGroup.getFirstDead();

        if (!scoreNumberText) {

            scoreNumberText = game.add.bitmapText(x, y, 'font', String(scored), 50);
            scoreNumberText.anchor.setTo(0.5);
            scoreNumberGroup.add(scoreNumberText);

        } else {
            scoreNumberText.position.setTo(x, y);
            scoreNumberText.alpha = 1;
            scoreNumberText.setText(scored);
            scoreNumberText.revive();
        }

        scoreNumberTextAnim = game.add.tween(scoreNumberText);
        scoreNumberTextAnim.to({alpha: 0, y: scoreNumberText.y - 100}, 1000, Phaser.Easing.Linear.None);
        scoreNumberTextAnim.onComplete.add(function() {
            scoreNumberText.kill();
        });
        scoreNumberTextAnim.start();
    }
    
    function gameOver() {
        
        console.log('gameover()');
        currentstate = STATES.GAME_OVER;
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
        currentstate = STATES.PLAY;
        countDownTimer.resume();
        unfrozenBoard(); 
    }

    function restart() {

        console.log('restart');

        countDown = Config.countDown;
        score = 0;
        countDownTimer.resume();

        createTimeBar();
        updateScore();

        shuffle();
        removeInitialMatches();
        createDropAnimationStart(); 

        resume();
    }
    
    function shuffle() {
        bricksGroup.forEachAlive(function(brick) {
            setRandomFrame(brick);
        });
    }
    
    function frozenBoard() {
        console.log('frozenBoard()');
        bricksGroup.forEachAlive(function(brick) {
            brick.inputEnabled = false;
        });
    }

    function unfrozenBoard() {       
        console.log('unfrozenBoard()');
        bricksGroup.forEachAlive(function(brick) {
            brick.inputEnabled = true;
        });
    }

    /**
     * process
     */
    ;(function() {
         
        var queue = {};

        global.process = {
            handler : requestAnimationFrame || function(fn) {
                return setTimeout(fn, 16.666)
            },
            nextTick : function(fn, args, context) {
                args = args || [], context = context || null;
                return this.handler.call(context, function() {
                    return fn.apply(context, args);
                });
            },
            queue : {
                add : function(id) {
                    queue[id] = true;
                },
                has : function(id) {
                    return id in queue;
                },
                remove : function(id) {
                    delete queue[id];
                }
            }
        }

    })();

    /**
     * animation
     */
    ;(function() {

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

        function animation(brick, anim) {

            anim.time = anim.time || 200;
            anim.ease = anim.ease || Phaser.Easing.Linear.None;
            brick.tween = game.add.tween(brick);
            brick.tween.to(anim.to, anim.time, anim.ease);
            brick.tween.onComplete.add(function() {

                if (anim.done) {
                    anim.done();
                }
            });
            brick.tween.start();
        }

        function _animation(brick, anim) {

            if (!anim) {
                console.error('brick animation not defined');
                return false;
            }

            anim.time = anim.time || 200;
            anim.ease = anim.ease || Phaser.Easing.Linear.None;

            // anim.time = 2000;

            brick.tweens = brick.tweens || [];
            brick.tweens.push(anim);

            process.nextTick(execute, [brick]);
        }

        global.animation = animation;

    })();

    var Game = function(_game) {
        game = _game;
    }    

    Game.prototype = {

        create: function() {

            // disable auto pause on window blur
            // game.stage.disableVisibilityChange = true;

            currentstate = STATES.PLAY;

            // game.time.advancedTiming = true;
            // fpsText = game.add.text(0, 5, '00', {font: '16px Arial', fill: '#333'});
            // fpsText.x = game.width - fpsText.width - 5;

            entities = game.add.group();

            game.input.addMoveCallback(inputMove, this);

            game.input.onDown.add(function(input, event) {
                pointer.start = {x : input.position.x, y : input.position.y};

                if (currentstate === STATES.GAME_OVER) {
                    restart();
                }
            }, this);

            game.input.onUp.add(function(input, event) {
                pointer.start = null;
                pointer.end = {x : input.position.x, y : input.position.y};
            }, this);

            createBoard();

            sounds = {
                score : game.add.audio('score'),
                moveInvalid : game.add.audio('move-invalid'),
                explosion : game.add.audio('explosion')
            };

            scoreText = game.add.bitmapText(Config.board.x, 10, 'font', String(score), 40);

            btnPause = game.add.button(game.width - game.cache.getImage('btn-pause').width, 5, 'btn-pause', pause);
            btnPause.x -= btnPause.width - 15;
            btnPause.scale.setTo(1.5);

            game.plugins.screenShake = game.plugins.add(Phaser.Plugin.ScreenShake);
            game.plugins.screenShake.setup({
                shakeX: true,
                shakeY: true
            });
        },

        update : function() { 
            // fpsText.setText(this.time.fps);
        },

        render : function() {
        },

    } 

//     global.Game = Game;
//
// })(this);
