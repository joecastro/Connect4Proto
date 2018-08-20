class Player {
    constructor(name, color) {
        this.name = name;
        this.color = color;
    }
}

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.player = undefined;
        // Hacky, but showing off animation logic...
        this.frameCount = 0;
    }
}

class Game {
    constructor() {
        let width = 7;
        let height = 6;
        this.players = [ new Player("Player 1", "red"), new Player("Player 2", "yellow")];
        this.board = Array(width).fill().map((_, i) => Array(height).fill().map((_, j) => new Cell(i,j)));

        this._currentPlayerIndex = 0;
        this._winningPlayer = undefined;
        this._isBoardFull = false;

        this.instuctionalText =  this.players[this._currentPlayerIndex].name + "'s turn!";;
    }

    get isGameOver() {
        return this._winningPlayer !== undefined || this._isBoardFull;
    }

    _lookForWinningPlayer() {
        if (this._winningPlayer || this._isBoardFull) {
            return;
        }

        var board = this.board;

        var searchRight = function(x, y, player, streakRemaining) {
            if (streakRemaining === 0) {
                return true;
            }
            if (x >= board.length) {
                return false;
            }
            if (board[x][y].player !== player) {
                return false;
            }
            return searchRight(x+1, y, player, streakRemaining-1);
        }
        var searchDown = function(x, y, player, streakRemaining) {
            if (streakRemaining === 0) {
                return true;
            }
            if (y >= board[x].length) {
                return false;
            }
            if (board[x][y].player !== player) {
                return false;
            }
            return searchDown(x, y+1, player, streakRemaining-1);
        }
        var searchDiagonalRight = function(x, y, player, streakRemaining) {
            if (streakRemaining === 0) {
                return true;
            }
            if (x >= board.length || y >= board[x].length) {
                return false;
            }
            if (board[x][y].player !== player) {
                return false;
            }
            return searchDiagonalRight(x+1, y+1, player, streakRemaining-1);
        }
        var searchDiagonalLeft = function(x, y, player, streakRemaining) {
            if (streakRemaining === 0) {
                return true;
            }
            if (x < 0 || y >= board[x].length) {
                return false;
            }
            if (board[x][y].player !== player) {
                return false;
            }
            return searchDiagonalLeft(x-1, y+1, player, streakRemaining-1);
        }

        let isBoardMaybeFull = true;
        for (var i = 0; i < this.board.length; ++i) {
            for (var j = 0; j < this.board[i].length; ++j) {
                let player = this.board[i][j].player;
                if (!player) {
                    isBoardMaybeFull = false;
                    continue;
                }
                if (searchRight(i, j, player, 4) ||
                    searchDiagonalRight(i, j, player, 4) ||
                    searchDown(i, j, player, 4) ||
                    searchDiagonalLeft(i, j, player, 4)) {
                        this._winningPlayer = player;
                        break;
                }
            }
        }

        if (!this._winningPlayer && isBoardMaybeFull) {
            this._isBoardFull = true;
        }
    }

    playColumn(index) {
        if (this.isGameOver) {
            // Don't update instructional text in this case.
            return;
        }

        if (index < 0 || index > this.board.length) {
            this.instuctionalText = "Bad move. Can't play in that column";
            return;
        }

        let column = this.board[index];
        let success = false;
        for (var j = column.length-1; j >= 0; --j) {
            if (!column[j].player) {
                column[j].player = this.players[this._currentPlayerIndex];
                success = true;
                break;
            }
        }

        if (!success) {
            this.instuctionalText = "Can't play this column because it is full"
        }

        this._lookForWinningPlayer();
        if (this.isGameOver) {
            if (this._winningPlayer) {
                this.instuctionalText = this._winningPlayer.name + " won!";
            } else {
                this.instuctionalText = "Game over!"
            }
        } else {
            this._currentPlayerIndex = ++this._currentPlayerIndex % 2;
            this.instuctionalText = this.players[this._currentPlayerIndex].name + "'s turn!"; 
        }
    }
}

class BoardRenderer {
    constructor(board, canvas) {
        this.board = board;
        this.canvas = canvas;

        this.canvas.width = (board.length * 60) + 20;
        this.canvas.height = (board[0].length * 60) + 20;
        this.context = this.canvas.getContext("2d");
        this.frameNo = 0;
    }

    update() {
        const radius = 25;
        const padding = 5;
        const context = this.context;
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.fillStyle = "blue";
        context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.board.forEach(column => {
            column.forEach(cell => {

                context.beginPath();
                context.arc(10 + radius + (cell.x * 2 * (radius+padding)), 10 + 25 + (cell.y * 2 * (radius + padding)), radius, 0, 2 * Math.PI, false);
                if (cell.player) {
                    this.context.fillStyle = cell.player.color;
                } else {
                    this.context.fillStyle = "black";
                }
                context.fill();
                context.lineWidth = 3;
                context.strokeStyle = '#003300';
                context.stroke();
            });
        });
    }

    getColumnTapped(x, y) {
        // we're not really using the y component.
        return Math.floor((x-10) / 60);
    }
}

function startGame() {
    let game = new Game();
    let canvas = $("#canvas").get(0);
    let renderer = new BoardRenderer(game.board, canvas);

    var textElement = $("#caption").get(0);
    var captionCopy = "";
    var inputEvent = undefined;

    canvas.addEventListener("touchend", function (e) {
        var mouseEvent = new MouseEvent("mouseup", {});
        canvas.dispatchEvent(mouseEvent);
    }, false);
    canvas.addEventListener("mouseup", function (e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        inputEvent = renderer.getColumnTapped(x, y);
        console.log("Captured input event at " + x + " " + y + ". Interpreting that as column " + inputEvent + ".");
    }, false);

    setInterval(function() {
        if (!game.isGameOver) {
            if (inputEvent != undefined) {
                game.playColumn(inputEvent);
                inputEvent = undefined;
            }
        }

        renderer.update();

        if (captionCopy != game.instuctionalText) {
            captionCopy = game.instuctionalText;
            textElement.textContent = captionCopy;
        }
    
    }, 20);
}

$(document).ready(function () {
    startGame();
});
