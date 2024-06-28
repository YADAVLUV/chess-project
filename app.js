const express = require('express');
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index", { error: ' ', title: "chess game" });
});

io.on("connection", (uniquesocket) => {
    console.log("connected");

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.on("disconnect", () => {
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
        console.log("disconnected", players);
    });

    uniquesocket.on("move", (move) => {
        try {
            console.log("Received move:", move);

            if ((chess.turn() === 'w' && uniquesocket.id !== players.white) || 
                (chess.turn() === 'b' && uniquesocket.id !== players.black)) {
                console.log("Move rejected: not player's turn");
                return;
            }

            const result = chess.move(move);
            if (result) {
                console.log("Move accepted");
                io.emit("boardState", chess.fen()); // Broadcast the updated board state to all clients
            } else {
                console.log("Invalid move");
                uniquesocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log(err);
            uniquesocket.emit("invalidMove", move);
        }
    });
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
