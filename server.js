const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

const games = new Map();

server.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'CREATE_GAME':
                handleCreateGame(ws, data);
                break;
            case 'JOIN_GAME':
                handleJoinGame(ws, data);
                break;
            case 'MAKE_MOVE':
                handleMove(ws, data);
                break;
            case 'RESTART_GAME':
                handleRestart(ws, data);
                break;
            case 'END_GAME':
                handleEndGame(ws, data);
                break;
        }
    });

    ws.on('close', () => {
        // Clean up any abandoned games
        for (const [pin, game] of games.entries()) {
            if (game.player1 === ws || game.player2 === ws) {
                if (game.player1) game.player1.close();
                if (game.player2) game.player2.close();
                games.delete(pin);
            }
        }
    });
});

function handleCreateGame(ws, data) {
    const pin = data.pin;
    games.set(pin, {
        player1: ws,
        player2: null,
        board: Array(9).fill(''),
        currentPlayer: 'X',
        moveCount: 0
    });
}

function handleJoinGame(ws, data) {
    const pin = data.pin;
    const game = games.get(pin);
    
    if (game && !game.player2) {
        game.player2 = ws;
        
        // Notify both players that game is starting
        const startGameMsg = JSON.stringify({
            type: 'GAME_START',
            currentPlayer: 'X'
        });
        
        game.player1.send(startGameMsg);
        game.player2.send(startGameMsg);
    }
}

function handleMove(ws, data) {
    const game = games.get(data.pin);
    if (!game) return;

    const { index, player } = data;
    game.board[index] = player;
    game.moveCount++;
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

    const moveData = JSON.stringify({
        type: 'MOVE_MADE',
        index,
        player,
        currentPlayer: game.currentPlayer,
        board: game.board
    });

    game.player1.send(moveData);
    game.player2.send(moveData);
}

function handleRestart(ws, data) {
    const game = games.get(data.pin);
    if (!game) return;

    game.board = Array(9).fill('');
    game.moveCount = 0;
    game.currentPlayer = data.startingPlayer;

    const restartData = JSON.stringify({
        type: 'GAME_RESTART',
        currentPlayer: game.currentPlayer
    });

    game.player1.send(restartData);
    game.player2.send(restartData);
}

function handleEndGame(ws, data) {
    const game = games.get(data.pin);
    if (!game) return;

    if (game.player1) game.player1.close();
    if (game.player2) game.player2.close();
    games.delete(data.pin);
}