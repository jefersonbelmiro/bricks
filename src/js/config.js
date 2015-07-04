;(function(exports) {

    var brick = {
        margin: 10, //4,
        width : 104,
        height : 104,
    };

    var topBar = {
        height : 85,
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
        x : 3,//board.x + board.width,
        y: board.y + board.height,
        countDown: 120
    };

    var width = board.width + board.x; 
    var height = board.height + board.y + timeBar.height; 

    var Config = {

        background: '#222222',

        width : width,
        height : height,

        minScore : 3,

        brick : brick,
        board : board,
        timeBar : timeBar,

    };

    exports.Config = Config;

})(this);
