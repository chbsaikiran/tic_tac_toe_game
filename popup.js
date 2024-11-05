class TicTacToe {
    constructor() {
        this.currentPlayer = 'X';
        this.board = Array(9).fill('');
        this.gameActive = false;
        this.pin = null;
        this.isHost = false;
        this.moveCount = 0;
        this.ws = new WebSocket('ws://localhost:8080');
        this.setupWebSocket();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('generate-pin').addEventListener('click', () => this.generatePin());
        document.getElementById('submit-pin').addEventListener('click', () => this.joinGame());
        document.getElementById('restart-game').addEventListener('click', () => this.restartGame());
        document.getElementById('end-connection').addEventListener('click', () => this.endConnection());
        
        document.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });
    }

    setupWebSocket() {
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'GAME_START':
                    this.handleGameStart(data);
                    break;
                case 'MOVE_MADE':
                    this.handleRemoteMove(data);
                    break;
                case 'GAME_RESTART':
                    this.handleGameRestart(data);
                    break;
            }
        };

        this.ws.onclose = () => {
            this.gameActive = false;
            document.getElementById('status').textContent = 'Connection lost!';
        };
    }

    generatePin() {
        this.pin = Math.floor(10000 + Math.random() * 90000).toString();
        this.isHost = true;
        document.getElementById('pin-display').textContent = `Your PIN: ${this.pin}`;
        
        this.ws.send(JSON.stringify({
            type: 'CREATE_GAME',
            pin: this.pin
        }));
    }

    joinGame() {
        const inputPin = document.getElementById('pin-input').value;
        if (inputPin.length === 5) {
            this.pin = inputPin;
            this.isHost = false;
            
            this.ws.send(JSON.stringify({
                type: 'JOIN_GAME',
                pin: this.pin
            }));
        }
    }

    startGame() {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        this.gameActive = true;
        this.updateStatus();
    }

    handleCellClick(e) {
        if (!this.gameActive) return;
        
        const cell = e.target;
        const index = cell.dataset.index;

        if (this.board[index] === '' && 
            ((this.isHost && this.currentPlayer === 'X') || 
             (!this.isHost && this.currentPlayer === 'O'))) {
            
            this.ws.send(JSON.stringify({
                type: 'MAKE_MOVE',
                pin: this.pin,
                index: index,
                player: this.currentPlayer
            }));
        }
    }

    handleRemoteMove(data) {
        const { index, player, board, currentPlayer } = data;
        this.board = board;
        this.currentPlayer = currentPlayer;
        
        document.querySelectorAll('.cell')[index].textContent = player;
        this.moveCount++;

        if (this.checkWinner()) {
            this.endGame(`Player ${player} wins!`);
        } else if (this.moveCount === 9) {
            this.endGame("It's a draw!");
        } else {
            this.updateStatus();
        }
    }

    handleGameStart(data) {
        this.startGame();
    }

    handleGameRestart(data) {
        this.currentPlayer = data.currentPlayer;
        this.board = Array(9).fill('');
        this.moveCount = 0;
        this.gameActive = true;
        document.querySelectorAll('.cell').forEach(cell => cell.textContent = '');
        document.getElementById('game-end-controls').style.display = 'none';
        this.updateStatus();
    }

    checkWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        return winPatterns.some(pattern => {
            const [a, b, c] = pattern;
            return this.board[a] && 
                   this.board[a] === this.board[b] && 
                   this.board[a] === this.board[c];
        });
    }

    endGame(message) {
        this.gameActive = false;
        document.getElementById('status').textContent = message;
        document.getElementById('game-end-controls').style.display = 'block';
    }

    restartGame() {
        const startingPlayer = this.moveCount === 0 ? 'X' : 'O';
        
        this.ws.send(JSON.stringify({
            type: 'RESTART_GAME',
            pin: this.pin,
            startingPlayer
        }));
    }

    endConnection() {
        this.ws.send(JSON.stringify({
            type: 'END_GAME',
            pin: this.pin
        }));
        location.reload();
    }

    updateStatus() {
        const status = document.getElementById('status');
        if ((this.isHost && this.currentPlayer === 'X') || 
            (!this.isHost && this.currentPlayer === 'O')) {
            status.textContent = "Your turn";
        } else {
            status.textContent = "Opponent's turn";
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TicTacToe();
}); 