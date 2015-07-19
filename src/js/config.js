;(function(exports) {

    var brick = {
        margin: 10, 
        width : 104,
        height : 104,
    };

    var score = {
        minMatches : 3,
        point : 10,
    };

    var topBar = {
        height : 85,
    };

    var specials = {
        // times to multiply
        double :  2,
        // seconds to add to timer
        clock : 5
    };

    var board = {
        x : 0,
        y: topBar.height,
        rows: 8,
        cols : 6,
        celWidth : brick.width + brick.margin,
        celHeight : brick.height + brick.margin,
    };

    board.width = board.cols * board.celWidth; 
    board.height = board.rows * board.celHeight; 

    var timeBar = {
        width : board.width,
        height : 32,
        x : board.x,
        y: board.y + board.height,
        countDown: 120
    };

    var width = board.width + board.x; 
    var height = board.height + board.y + timeBar.height; 

    var Config = {

        background: '#222222',

        width : width,
        height : height,

        score : score,
        specials : specials,

        brick : brick,
        board : board,
        timeBar : timeBar,

    };

    exports.Config = Config;

})(this);
