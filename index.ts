import http from "http";
import express from "express";
import serveIndex from "serve-index";
import cors from "cors";
//import { tournamentSingletonClass } from "./src/GamePlay/tournamentHandler";
import { Server, matchMaker } from "colyseus";
import { GameRoom } from "./src/game-room";
// import { FriendInvite } from "./src/friend-invite";
import { ludo2PlayerLobbyRoom } from "./src/ludo_Lobby";
import { ludo3PlayerLobbyRoom } from "./src/ludo_Lobby3player";
import { ludo4PlayerLobbyRoom } from "./src/ludo_Lobby4player";
import path from "path";
import { playWithFriends } from "./src/ludo_playWithfriendsLobby";
import {TournamentLobbyRoom } from './src/tournamentLobbyRoom';
import {TournamentGameRoom } from './src/tournamentGameRoom';
import { monitor } from "@colyseus/monitor";
import { ChampionshipLobbyRoom } from "./src/ChampionshipLobbyRoom";
import { ChampionshipGameRoom } from "./src/ChampionshipGameRoom";
import { AIGameRoom } from "./src/AI-game-room";
// import { apiService } from "./src/GamePlay/api";
// config for your database

const app = express();
const port = Number(process.env.PORT || 3003);

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const gameServer = new Server({
  server: server,
  express: app,
});
// app.post("/createTournamentRound", apiService.createTournamentRouond);


gameServer.define("game", GameRoom);
gameServer.define("ludo2PlayerLobbyRoom", ludo2PlayerLobbyRoom);
gameServer.define("ludo3PlayerLobbyRoom", ludo3PlayerLobbyRoom);
gameServer.define("ludo4PlayerLobbyRoom", ludo4PlayerLobbyRoom);
gameServer.define("playWithFriends", playWithFriends);
gameServer.define("tournamentLobbyRoom", TournamentLobbyRoom);
gameServer.define("tournamentGameRoom", TournamentGameRoom);
gameServer.define("championshipGameRoom", ChampionshipGameRoom);
gameServer.define("championshipLobbyRoom", ChampionshipLobbyRoom);
gameServer.define("AIGameRoom", AIGameRoom)
// gameServer.define("friendInvite", FriendInvite);
gameServer.listen(port);
app.use("/colyseus", monitor());
app.use("/", express.static(path.join(__dirname, "static")));
app.use("/", serveIndex(path.join(__dirname, "static"), { icons: true }));
console.log(`Listening on ws://localhost:${port}`);
