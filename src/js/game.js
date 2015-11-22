;(function(global) {

    'use strict';

    var 
        game, 
        entities, bricksGroup, scoreNumberGroup, 
        bricks = {}, selectedBrick,  
        currentstate, STATES = { PAUSED: 'paused', PLAY: 'play', SCORE: 'score', GAME_OVER: 'game_over' }, 
        fpsText, scoreText,
        score = 0, best = localStorage.getItem('pixel_bricks_best') || 0, 
        sounds,
        btnPause,
        timeBar, countDownTimer, countDown,
        pointer = { start : null, end : null },
        temporaryObjects
    ;

    function createBoard() {

        bricksGroup = game.add.group();
        scoreNumberGroup = game.add.group();
        
        bricksGroup.position.setTo(Config.board.x, Config.board.y);
        scoreNumberGroup.position.setTo(bricksGroup.x, bricksGroup.y);

        for (var row = 0; row < Config.board.rows; row++) {

            bricks[row] = {};

            for (var col = 0; col < Config.board.cols; col++) {
                var brick = createBrick(row, col);
            }
        }

        createTimeBar();

        entities.add(bricksGroup);
        entities.add(scoreNumberGroup);

        removeInitialMatches();
        createDropAnimationStart(); 
    } 

    function createTimeBar() {

        countDown = Config.timeBar.countDown;

        if (!timeBar) {
            timeBar = game.add.tileSprite(
                Config.timeBar.x, Config.timeBar.y, Config.timeBar.width, Config.timeBar.height, 'time-bar'
            ); 
            entities.add(timeBar);
        }
        
        timeBar.width = Config.timeBar.width;
        timeBar.height = Config.timeBar.height;

        timeBar.updateTime = 1/15;
        timeBar.percent = timeBar.updateTime / countDown * 100;
        timeBar.subTimeBar = timeBar.width * timeBar.percent/100; 

        if (countDownTimer) {
            countDownTimer.destroy();
        } 

        countDownTimer = game.time.create(false);
        countDownTimer.loop(timeBar.updateTime * Phaser.Timer.SECOND, function() {

            countDown -= timeBar.updateTime;
            timeBar.width -= timeBar.subTimeBar;

            if (countDown <= 0) {
                gameOver();
            }

        });
        countDownTimer.start(); 
    }

    function createSpecialBrick(row, col) {

        var types = ['bomb', 'double', 'clock'];
        var type = types[game.rnd.integerInRange(0, types.length - 1)];
        var brick = createBrick(row, col, type);
        var special = game.add.sprite(0, 0, type);

        brick.addChild(special);
        return brick;
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

    function createModalLayer() {
        var modal = entities.create(0, 0, createRect(game.width, game.height, 'rgba(25, 25, 25, 0.9)')); 
        modal.bringToTop();
        return modal;
    }

    function createBrick(row, col, type) {

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
        brick._type = type || false;

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

            if (selectedBrickSameColor.length >= Config.score.minMatches || brickSameColor.length >= Config.score.minMatches) {

                if (selectedBrickSameColor.length > Config.score.minMatches) {
                    selectedBrick._reborn = true;
                }

                if (brickSameColor.length > Config.score.minMatches) {
                    brick._reborn = true;
                }

                if (selectedBrickSameColor.length >= Config.score.minMatches) {
                    bricksMatch = bricksMatch.concat(selectedBrickSameColor.matches);
                }

                if (brickSameColor.length >= Config.score.minMatches) {
                    bricksMatch = bricksMatch.concat(brickSameColor.matches);
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
            processMatches(removeDuplicates(matches));
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

        animation(brick, { to: to, time: time, ease: Phaser.Easing.Linear.None, done: function() {

            if (brick._type == 'clock') {

                var text = game.add.bitmapText(timeBar.x, timeBar.y + timeBar.height/2, 'font', '+5s', 30);
                text.anchor.setTo(0.5);

                var textAnim = game.add.tween(text);
                textAnim.to({x: text.x + 100, alpha : 0}, 500, Phaser.Easing.Linear.None);
                textAnim.onComplete.add(function() {
                    text.destroy();
                });
                textAnim.start();
            }

            brick.kill();
            bricks[brick.row][brick.col] = null;

            if (brick._reborn) {

                var brickReborn = createSpecialBrick(brick.row, brick.col);
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

                if (brickSameColor.matches.length < Config.score.minMatches) {
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

                    if (brickSameColor.matches.length > Config.score.minMatches) {
                        brick._reborn = true;
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

        brickBomb._type = 'explode';
        var matches = [brickBomb];
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

            if (!brick || brick.dying || brick == brickBomb) {
                continue;
            }

            brick._type = 'explode';
            matches.push(brick);
        }

        for (var col = 0; col < Config.board.cols; col++) {

            var brick = getBrick(_row, col);

            if (!brick || brick.dying || brick == brickBomb) {
                continue;
            }

            brick._type = 'explode';
            matches.push(brick);
        }

        return processMatches(matches, true);
    } 

    function processMatches(bricksArray, background) {

        if (currentstate !== STATES.PLAY || bricksArray.length == 0) {
            return 0;
        }

        var 
            length = bricksArray.length,
            last = length - 1, 
            scored = 0,
            specialDouble = 0,
            specialClock = 0
        ;

        if (length == 0) {
            return scored;
        }

        frozenBoard();

        var _row = bricksArray[0].row, _col = bricksArray[0].col;

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

                scored += explode(brick);

                if (bricksArray[0]._type !== 'bomb') {
                    _row = brick.row;
                    _col = brick.col;
                }

                continue;
            } 

            if (brick._type === 'double') {
                specialDouble += Config.specials.double;
            } 

            if (brick._type === 'clock') {
                specialClock += Config.specials.clock;
            }

            scored += Config.score.point;
            killBrick(brick, callback);
        }

        if (!background) {

            var scoredText = scored;

            if (specialDouble) {

                scoredText = String(specialDouble) + 'x' + String(scored);
                scored *= specialDouble;
            }

            if (specialClock) {

                var bonus = Config.specials.clock;

                countDown += bonus;
                timeBar.percent = timeBar.updateTime / countDown * 100;

                var diff = Math.round(timeBar.width / Math.round(countDown/bonus));
                timeBar.width = Math.min(timeBar.width + diff, Config.timeBar.width);
                timeBar.subTimeBar = timeBar.width * timeBar.percent/100; 
            }

            score += scored;

            sounds.score.play();
            updateScore();

            createScoreNumber(
                (_col * Config.board.celWidth) + Config.brick.width/2, 
                (_row * Config.board.celHeight) + Config.brick.height/2, 
                scoredText
            ); 
        }

        return scored;
    }

    function drop() {

        var time = 200;
        var ease = Phaser.Easing.Bounce.Out;
        var moves = [];

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

        var length = moves.length, last = length - 1; 

        if (length == 0) {
            return false;
        }

        frozenBoard();

        for (var index = 0; index < length; index++) {

            var brick = moves[index];
            var callback = false;

            if (index == last) {
                callback = function() {
                    
                    var matches = findMatches();
                    if (matches.length == 0) {
                        
                        unfrozenBoard();
                        return process.nextTick(drop);
                    }
                    return processMatches(matches);
                }
            }

            move(brick, callback, time, ease);
        }
    }

    function getSameColor(brick) {

        var result = [], horizontal = [brick], vertical = [brick];

        horizontal = horizontal.concat(getSameColorByDirection(brick, 0, -1));
        horizontal = horizontal.concat(getSameColorByDirection(brick, 0, 1));

        vertical = vertical.concat(getSameColorByDirection(brick, -1, 0));
        vertical = vertical.concat(getSameColorByDirection(brick, 1, 0));

        if (horizontal.length >= Config.score.minMatches) {
            result = result.concat(horizontal);
        }

        if (vertical.length >= Config.score.minMatches) {
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

    function createScoreNumber(x, y, text, type) {

        var type = type || 'score';
        var scoreNumberText = scoreNumberGroup.getFirstDead();

        if (!scoreNumberText) {

            scoreNumberText = game.add.bitmapText(x, y, 'font', String(text), 50);
            scoreNumberText.anchor.setTo(0.5);
            scoreNumberGroup.add(scoreNumberText);

        } else {
            scoreNumberText.position.setTo(x, y);
            scoreNumberText.alpha = 1;
            scoreNumberText.setText(text);
            scoreNumberText.revive();
        }
        
        if (scoreNumberText.x <= scoreNumberText.width/2) {
            scoreNumberText.x = scoreNumberText.width/2;
        }

        if (scoreNumberText.x + scoreNumberText.width/2 >= Config.board.width) {
            scoreNumberText.x = Config.board.width - scoreNumberText.width/2;
        }

        var to = {alpha: 0, y: scoreNumberText.y - 100}

        var scoreNumberTextAnim = game.add.tween(scoreNumberText);
        scoreNumberTextAnim.to(to, 1000, Phaser.Easing.Linear.None);
        scoreNumberTextAnim.onComplete.add(function() {
            scoreNumberText.kill();
        });
        scoreNumberTextAnim.start();
    }
    
    function gameOver() {
        
        currentstate = STATES.GAME_OVER;

        best = Math.max(score, best);
        localStorage.setItem('pixel_bricks_best', best); 

        var layer = createModalLayer();

        countDownTimer.pause();
        frozenBoard();

        var gameOverText = game.add.bitmapText(game.world.centerX, game.world.centerY, 'font', 'GAME OVER', 66);
        gameOverText.anchor.setTo(0.5); 
        gameOverText.alpha = 0;
        gameOverText.y -= gameOverText.height * 2;

        var textScore = game.add.bitmapText(game.world.centerX, game.height, 'font', 'SCORE: ' + score, 33);
        textScore.anchor.setTo(0.5);
        textScore.alpha = 0.6;
        textScore.y -= textScore.height;

        var restartText = game.add.bitmapText(0, 0, 'font', 'TRY AGAIN', 30); 
        restartText.anchor.setTo(0.5);
        restartText.alpha = 0.7;

        var padding = 24;
        var restartTextRect = game.add.sprite(
            game.world.centerX,
            gameOverText.y + gameOverText.height + 100,
            createRect(restartText.width + padding, restartText.height + padding, '#333')
        );

        restartTextRect.anchor.setTo(0.5);
        restartTextRect.inputEnabled = true;
        restartTextRect.events.onInputDown.add(function() {
            if (restartTextRect.alpha > 0.5) {
                restart();
            }
        });
        restartTextRect.addChild(restartText);
        restartTextRect.alpha = 0;

        var restartTextTween = game.add.tween(restartTextRect);
        restartTextTween.to({alpha : 1}, 1000, Phaser.Easing.Linear.None);

        var gameOverTextTween = game.add.tween(gameOverText);
        gameOverTextTween.to({alpha: 1}, 3000, Phaser.Easing.Bounce.Out);

        gameOverTextTween.start();

        var timer = game.time.create(game);
        timer.add(1000, function() {
            restartTextTween.start();
        });
        timer.start();

        temporaryObjects.add(layer);
        temporaryObjects.add(restartTextRect);
        temporaryObjects.add(gameOverText);
        temporaryObjects.add(textScore);
    }

    function pause() {

        currentstate = STATES.PAUSED;

        temporaryObjects.add(createModalLayer())

        countDownTimer.pause();
        frozenBoard(); 

        var menus = [
            {
                text : 'RESUME', 
                inputDown: resume
            },
            {
                text : 'MENU', 
                inputDown: function() {

                    window.document.location.href = window.document.location.href;

                    // @todo - trocar para phaeser dev 2.4
                    // game.state.start('menu'); 
                }
            },
        ];

        var padding = 24;
        var marginTop = game.world.centerY - 100;

        for (var i = 0, len = menus.length; i < len; i++) {
            
            var menu = menus[i];
            var text = game.add.bitmapText(0, 0, 'font', menu.text, 30);
            text.anchor.setTo(0.5)
            text.alpha = 0.7;

            var textRect = game.add.sprite(
                game.world.centerX,
                marginTop,
                createRect(text.width + padding, text.height + padding, '#333')
            );

            textRect.anchor.setTo(0.5);
            textRect.inputEnabled = true;
            textRect.events.onInputDown.add(menu.inputDown);
            textRect.addChild(text);

            marginTop = textRect.y + 90;

            temporaryObjects.add(textRect);
        }
    }

    function resume() {

        currentstate = STATES.PLAY;
        countDownTimer.resume();
        unfrozenBoard(); 
        cleanTemporaryObjects();
    }                                              

    function restart() {

        cleanTemporaryObjects();

        score = 0;

        createTimeBar();
        updateScore();

        shuffle();
        removeInitialMatches();
        createDropAnimationStart(); 

        currentstate = STATES.PLAY;
        unfrozenBoard(); 
    }

    function cleanTemporaryObjects() {

        temporaryObjects.forEach(function(obj) {
            obj.kill();
        });

        temporaryObjects.forEach(function(obj) {
            obj.destroy();
        });
    }
    
    function shuffle() {
        bricksGroup.forEachAlive(function(brick) {
            brick.removeChildren();
            setRandomFrame(brick);
        });
    }
    
    function frozenBoard() {
        bricksGroup.forEachAlive(function(brick) {
            brick.inputEnabled = false;
        });
    }

    function unfrozenBoard() {       

        if (currentstate === STATES.GAME_OVER) {
            return false;
        }

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

            game.input.addMoveCallback(inputMove, this);

            game.input.onDown.add(function(input, event) {
                pointer.start = {x : input.position.x, y : input.position.y};
            }, this);

            game.input.onUp.add(function(input, event) {
                pointer.start = null;
                pointer.end = {x : input.position.x, y : input.position.y};
            }, this);

            sounds = {
                score : game.add.audio('score'),
                moveInvalid : game.add.audio('move-invalid'),
                explosion : game.add.audio('explosion')
            };

            btnPause = game.add.button(game.width - game.cache.getImage('btn-pause').width, 5, 'btn-pause', pause);
            btnPause.x -= btnPause.width - 15;
            btnPause.scale.setTo(1.5);

            game.plugins.screenShake = game.plugins.add(Phaser.Plugin.ScreenShake);
            game.plugins.screenShake.setup({
                shakeX: true,
                shakeY: true
            });

            score = 0;
            scoreText = game.add.bitmapText(Config.board.x, 10, 'font', String(score), 40);

            entities = game.add.group();
            temporaryObjects = game.add.group(); 
            createBoard();
        },

        update : function() { 
            // fpsText.setText(this.time.fps);
        },

        render : function() {
        },

    } 

    global.Game = Game;

})(this);
