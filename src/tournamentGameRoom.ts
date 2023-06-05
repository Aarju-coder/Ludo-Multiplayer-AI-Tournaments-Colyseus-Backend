import { Room, Client, Delayed } from "colyseus";
import { State } from "./GamePlay/GameState";
import { LudoPlayer } from "./GamePlay/LudoPlayer";
import { Settings } from "./GamePlay/Settings";
import { Card } from "../typings/Card";
import { Player } from "./GamePlay/Player";
import { Events } from "./events";
import { Game } from "./GamePlay/game";
import { HttpClient } from "typed-rest-client/HttpClient";
import { tournamentSingletonClass } from "./GamePlay/tournamentHandler";
const CONSTANTS = {
  defaultColors: ["red", "green", "yellow", "blue"],
  //defaultColors: ['blue', 'yellow', 'green', 'red']
};
interface ClientStat {
  client: Client;

  waitingTime: number;
  options?: any;
  coin: number;
  dbId: number;
  confirmed?: boolean;
  userName: string;
  avatar: string;
  active: boolean;
}
//let playersInGame = {};
export class TournamentGameRoom extends Room<State> {
  // When room is initialized

  roomIdNo = 0;
  games = {};
  nextRoundTimer: Delayed;
  turnTimer: Delayed;
  canBid = [];
  // maxScore = 500;
  maxScore = 30;
  maxClients = 2;
  gridSize: number = 8;
  startingFleetHealth: number = 2 + 3 + 5;
  playerHealth: Array<number>;
  placements: Array<Array<number>>;
  playersPlaced: number = 0;
  playerCount: number = 0;
  playerCardsRecieved: number = 0;
  playerReady: number = 0;
  playerBidsRecieved: number = 0;
  eventHandler: Events;
  activePlayerIndex: number = 0;
  turnCardsSelected: number = 0;
  //turnSuit: CardSuit;
  gameId: number;
  turnNumber: number = 1;
  turnTime: Date;
  gameCompleted: boolean = false;

  bidInterval: Delayed;
  betAmount: number = 0;
  /**
   * php connection boolean
   */
  phpRequest: boolean = true;
  serverURL: String = "";
  endPoint: String = "";
  localRequest: boolean = false;
  gameTurnTimer = 30000;
  turnCount: number = 0;

  bidCard: Card;
  // bidWinner:Player;

  tournamentPlayers = [];
  gameType: String = "";
  selectedPiece: any = {};
  tileID: any;
  myPiece: number = 0;
  gameLobby = [];
  availablePlayers = [];
  playersInGame = {};
  //availablePlayers: number[];
  num: number;
  players: any;
  winnerUserNames = [];
  winnerAvatars = [];
  winnerUserId = [];
  looserId: number;
  gameOverIndex: boolean = false;
  clientSpectator: any[] = [];
  tournamentStartTime: any;
  tournamentHandler: tournamentSingletonClass;
  round: number;
  t_id: string;
  g: any;
  timeRemaining: any; //game class instance
  stats: ClientStat[] = [];
  lastRound: boolean = false;
  gameStarted: boolean = false;
  // countForUserColor: number;

  onCreate(options: any) {
    this.reset();
    //console.log("create game room", options);
    this.num = options.playerCount;
    // for (let i = 0; i < this.num; i++) {
    //   this.winnerUserId.push(null);
    // }
    this.maxClients = options.playerCount;
    this.roomId = String(options.roomId);
    this.lastRound = options.lastRound;
    console.log("roomId -> ", this.roomId, " last Round ", options.lastRound);
    this.tournamentHandler = tournamentSingletonClass.getInstance();
    this.round = this.tournamentHandler.getRound(options.t_id);
    this.t_id = options.t_id;
    console.log("round -> ", this.round);
    console.log("options.t_id -> ", options.t_id);
    var roomData: Array<any> = [this, false, null];
    this.tournamentHandler.addGameRoomData(this.roomId, roomData);
    if (this.round == 1) {
      this.tournamentStartTime = new Date(options.tournamentStartTime);
    }
    this.setState(new State());
    this.eventHandler = new Events(this);
    this.state.status = Settings.gameStatus.WAITING;
    this.setEvents();
    console.log("tournament game room created");

    var gameStartTimer = setTimeout(() => {
      try {
        clearInterval(currentTimeInterval);
        clearTimeout(gameStartTimer);
        console.log("gameStart");
        this.onGameStart();
      } catch (e) {
        console.log(e);
      }
    }, 45000);
    var currentTimeInterval = setInterval(() => {
      this.timeRemaining = getTimeLeft(gameStartTimer);
      //console.log("Time left: ", this.timeRemaining, "s");
    }, 1000);
    const getTimeLeft = (gameStartTimer) => {
      return Math.ceil(
        (gameStartTimer._idleStart + gameStartTimer._idleTimeout - Date.now()) /
          1000
      );
    };
  }

  // When client successfully join the room
  onJoin(client: Client, options: any, auth: any) {
    //console.log("clientsConnectedToRoom -> ", this.clients);
    try {
      client.send("yourId", { id: client.id });
      this.playerCount++;
      let p = new LudoPlayer(client);
      let player = new Player(client, {
        userId: options.userId,
        coin: options.coin,
        userName: options.userName,
        avatar: options.avatar.toString(),
        team: options.team,
      });
      this.playersInGame[client.id] = p;
      this.state.players[client.sessionId] = player;
      var num = this.num;
      console.log("type---------->", num, " -------->", client.id);
      console.log("gameLobby 1-----> ", JSON.stringify(this.gameLobby));
      this.gameLobby.push(this.playersInGame[client.id]);
      console.log("gameLobby 2-----> ", JSON.stringify(this.gameLobby));
      client.send("gameStartingIn", { timeRemaining: this.timeRemaining });
      this.stats.push({
        client: client,
        coin: parseInt(options.coin),
        waitingTime: 0,
        dbId: parseInt(options.dbId),
        userName: options.userName,
        avatar: JSON.stringify(options.avatar),
        active: true,
        options,
      });
      ////console.log("client-----",client);
    } catch (e) {
      //console.log("on join error >>>>>>>>>>", e);
    }
  }
  onGameStart() {
    this.lock();
    if (this.playerCount == 1) {
      this.winnerAvatars.push(this.stats[0].avatar);
      this.winnerUserId.push(this.stats[0].dbId);
      this.winnerUserNames.push(this.stats[0].userName);
      console.log("last round in game start one player ", this.lastRound);
      if (!this.lastRound) {
        this.stats[0].client.send("onePlayerWinner", {
          winnerAvatar: this.stats[0].avatar,
          winnerUserId: this.stats[0].dbId,
          winnerUserNames: this.stats[0].userName,
        });
        var roomData: Array<any> = [
          this,
          true,
          {
            userId: this.stats[0].dbId,
            rank1: this.stats[0].userName,
            rank1Avatar: this.stats[0].avatar,
          },
        ];
        this.tournamentHandler.addGameRoomData(this.roomId, roomData);
      } else {
        this.broadcast("tournamentEnded", {
          rank1: this.winnerUserNames[0],
          rank1Avatar: this.winnerAvatars[0],
          rank2: "",
          rank2Avatar: "0",
          rank3: "",
          rank3Avatar: "0",
        });
        this.tournamentHandler.saveWinnerDb(
          this.winnerUserId.map((id) => ({ userId: id })),
          this.t_id,
          this.round
        );
      }
      //this.gameOverInRoom = true;
    } else if (this.playerCount > 1) {
      for (let i = 0; i < this.playerCount; i++) {
        this.winnerUserId.push(null);
      }
      var num = this.playerCount;
      this.roomIdNo++;
      this.availablePlayers = [0, 1, 2, 3];
      console.log("type---------->", num);
      if (num == 2) {
        this.availablePlayers = [0, 2];
      } else if (num == 3) {
        this.availablePlayers = [0, 2, 3];
      }

      console.log("gameLobby 3-----> ", JSON.stringify(this.gameLobby));
      this.gameLobby.forEach((element: any, index: any) => {
        //console.log("element --------> ", element, index)
        element.sock.roomId = this.roomIdNo;
        element.inGame = true;
        element.gameMode = num;
        element.sock.playerIndex = this.availablePlayers[index];
        // element.userName = "";
        // element.userColor = "";
        //console.log('index is!!!!!!')
        //console.log(element.sock.playerIndex)
        //console.log('index is!!!!!!')
      });
      let g = new Game(this.gameLobby, this);
      console.log("g.players -> ", g.players);
      let temp = g.players;
      let j = -1;
      g.players = [];
      for (let i = 0; i < 4; i++) {
        if (this.availablePlayers.includes(i)) {
          g.allGottis[i] = {};
          g.allGottisAfterReconnection[i] = {};
          for (let j = 0; j < g.gottisInside[i].length; j++) {
            let col = g.gottisInside[i][j];
            g.allGottis[i][col] = 0;
            g.allGottisAfterReconnection[i][col] = 0;
          }
          j++;
          g.players[i] = temp[j];
          g.players[i].playerColor = CONSTANTS.defaultColors[i];
          console.log("g.players -> ", g.players[i]);
          //player.color = CONSTANTS.defaultColors[i];
        }
      }
      this.players = g.players;
      g.players.forEach((player: any) => {
        ////console.log("Player--------->", player);

        if (player != null) {
          //console.log("Inside sending colors----> ");
          player.sock.send("userColor", {
            id: player.sock.id,
            playerColor: player.playerColor,
            playerCount: this.maxClients,
          });
        }
      });
      let places = [];
      let noOfPowerUps = 5 + Math.ceil(Math.random() * 5);
      for (let i = 0; i < noOfPowerUps; i++) {
        let loc = Math.ceil(Math.random() * 52);
        if (
          !places.includes(loc) &&
          loc != 40 &&
          loc != 1 &&
          loc != 48 &&
          loc != 14 &&
          loc != 9 &&
          loc != 22 &&
          loc != 27 &&
          loc != 35
        ) {
          g.powerUpsLocation[loc] =
            g.availablePowerUps[
              Math.floor(Math.random() * g.availablePowerUps.length)
            ];
        }
      }
      //prepares the ludo board in all the players
      let playerIds = [];
      let names = [];
      ////console.log("player Colors ", g.players);
      for (let i = 0; i < g.players.length; i++) {
        if (g.players[i] && g.players[i].WebSocketClient) {
          playerIds.push(g.players[i].WebSocketClient.id);
          names.push(g.players[i].name);
        } else {
          playerIds.push(0);
          names.push("");
        }
      }
      //console.log("Outside StartGame");
      // client.send("userArraysent",{});
      this.gameStarted = true;
      this.broadcast("startGame", {
        powerUps: g.powerUpsLocation,
        availablePlayers: this.availablePlayers,
        gottisInside: g.gottisInside,
        playerIds: playerIds,
        names: names,
      });

      this.games[this.roomIdNo] = g;
      // if(this.turnTimerStarted == true){
      //     // let Timeout1 = setInterval(()=>{
      // //     //console.log("this here in timeout1");
      // //      this.games[this.roomIdNo].noPlayerChange = 0;
      // //     this.games[this.roomIdNo].playerIndicator();
      // // },15000);
      // }
      var Timeout = setTimeout(() => {
        clearTimeout(Timeout);
        this.games[this.roomIdNo].playerIndicator(0);
      }, 1500);
      // let Timeout1 = setInterval(()=>{
      //     //console.log("this here in timeout1");
      //      this.games[this.roomIdNo].noPlayerChange = 0;
      //     this.games[this.roomIdNo].playerIndicator();
      // },15000);
      this.gameLobby = [];
    } else {
      //this.gameOverInRoom = true;
      //if no player connected to this room
      var roomData: Array<any> = [
        this,
        true,
        { userId: null, rank1: null, rank1Avatar: null },
      ];
      this.tournamentHandler.addGameRoomData(this.roomId, roomData);
      this.disconnect();
    }
  }

  // AIPlay() {
  getPlayer(client) {
    let playerData;
    this.state.players.forEach((player, key) => {
      // for (var i in this.state.players) {
      if (client.id === player.id)
        playerData = {
          player: player,
          index: player.index,
        };
    });
    return playerData;
  }
  // When a client leaves the room
  async onLeave(client: Client, consented: boolean) {
    try {
      console.log("playerCount -> ", this.playerCount);
      console.log("clientSpectator - ", this.clientSpectator);
      if (
        !this.clientSpectator.find((sessionId) => sessionId == client.sessionId)
      ) {
        this.playerCount--;
        if (!this.gameStarted) {
          this.gameLobby.forEach((lobby, index) => {
            if (lobby.sock.id == client.id) {
              this.gameLobby.splice(index, 1);
            }
          });
          this.stats.forEach((stat, index) => {
            if (stat.client.id == client.id) {
              this.stats.splice(index, 1);
            }
          });
          console.log(
            "gameLobby pop before gameStart",
            this.gameLobby,
            "\n",
            this.stats
          );
        }
        console.log("decrease player count when player is not a spectator ");
      
      console.log("playerCount 1 - ", this.playerCount);
      let player = this.getPlayer(client).player;
      player.connected = false;
      this.stats.forEach((clientWinner, index) => {
        if (clientWinner.client.id == client.id) {
          this.stats[index].active = false;
        }
      });

      if (consented) {
        throw new Error("consented leave");
      } else {
        let LudoPlayerIndex;
        let disconnectedClientUserName;
        let disconnectedClientPlayerColor;
        let disconnectedClientAvatar;
        let disconnectedClientUserId;
        let tempClientData;
        if (this.games[this.roomIdNo].players != null) {
          this.games[this.roomIdNo].players.forEach(
            (LudoPlayer: LudoPlayer, i) => {
              if (LudoPlayer.sock.sessionId === client.sessionId) {
                LudoPlayerIndex = i;
                disconnectedClientUserName =
                  this.games[this.roomIdNo].players[LudoPlayerIndex].userName;
                disconnectedClientUserId =
                  this.games[this.roomIdNo].players[LudoPlayerIndex].userId;
                disconnectedClientAvatar =
                  this.games[this.roomIdNo].players[LudoPlayerIndex].avatar;
                disconnectedClientPlayerColor =
                  this.games[this.roomIdNo].players[LudoPlayerIndex]
                    .playerColor;
              }
            }
          );
          if (disconnectedClientPlayerColor == "yellow") {
            //console.log("deleting the yellow player")
            tempClientData =
              this.games[this.roomIdNo].allGottisAfterReconnection[2];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[2];
          } else if (disconnectedClientPlayerColor == "red") {
            //console.log("deleting the red player")
            tempClientData =
              this.games[this.roomIdNo].allGottisAfterReconnection[0];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[0];
          } else if (disconnectedClientPlayerColor == "green") {
            //console.log("deleting the green player")
            tempClientData =
              this.games[this.roomIdNo].allGottisAfterReconnection[1];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[1];
          } else if (disconnectedClientPlayerColor == "blue") {
            //console.log("deleting the blue player")
            tempClientData =
              this.games[this.roomIdNo].allGottisAfterReconnection[3];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[3];
          }
          this.broadcast(
            "waitingForRejoin",
            {
              id: client.id,
              playerColor: disconnectedClientPlayerColor,
              playerCount: this.maxClients,
              playerLeftInGame: this.playerCount,
            },
            { except: client }
          );
        }
        console.log(
          "this.games.allGottisAfterReconnection before Reconnect -> ",
          this.games[this.roomIdNo].allGottisAfterReconnection
        );

        console.log("playerCount before Reconnect -> ", this.playerCount);
        //this.broadcast("waitingForRejoin");
        // allow disconnected client to reconnect into this room until 15 seconds
        await this.allowReconnection(client, 15);
        player.connected = true;
        this.stats.forEach((clientWinner, index) => {
          if (clientWinner.client.id == client.id) {
            this.stats[index].active = true;
          }
        });
        let LudoPlayerAfterReconnection = new LudoPlayer(client);

        this.games[this.roomIdNo].players[LudoPlayerIndex] =
          LudoPlayerAfterReconnection;
        this.games[this.roomIdNo].players[LudoPlayerIndex].userName =
          disconnectedClientUserName;
        this.games[this.roomIdNo].players[LudoPlayerIndex].playerColor =
          disconnectedClientPlayerColor;
        (this.games[this.roomIdNo].players[LudoPlayerIndex].avatar =
          disconnectedClientAvatar),
          (this.games[this.roomIdNo].players[LudoPlayerIndex].userId =
            disconnectedClientUserId);

        this.players = this.games[this.roomIdNo].players;

        //this.players = this.games[this.roomId].players;
        if (disconnectedClientPlayerColor == "yellow") {
          //console.log("deleting the yellow player")
          this.games[this.roomIdNo].allGottisAfterReconnection[2] =
            tempClientData;
        } else if (disconnectedClientPlayerColor == "red") {
          //console.log("deleting the red player")
          this.games[this.roomIdNo].allGottisAfterReconnection[0] =
            tempClientData;
        } else if (disconnectedClientPlayerColor == "green") {
          //console.log("deleting the green player")
          this.games[this.roomIdNo].allGottisAfterReconnection[1] =
            tempClientData;
        } else if (disconnectedClientPlayerColor == "blue") {
          //console.log("deleting the blue player")
          this.games[this.roomIdNo].allGottisAfterReconnection[3] =
            tempClientData;
        }
        console.log(
          "this.games.allGottisAfterReconnection after Reconnect after addition of player in array -> ",
          this.games[this.roomIdNo].allGottisAfterReconnection
        );
        console.log("afterReconnection");
        this.playerCount++;
        //console.log("this.players after Reconnect -> ", this.players);
        client.send("updateLudoPiecesAfterReconnection", {
          allGottis: this.games[this.roomIdNo].allGottis,
        });
        const reconnectPlayerObject = {
          userName: this.players[LudoPlayerIndex].userName,
          avatar: this.players[LudoPlayerIndex].avatar,
          id: client.id,
          playerColor: disconnectedClientPlayerColor,
          playerCount: this.maxClients,
          playerLeftInGame: this.playerCount,
        };
        console.log("player count after Reconnect -> ", this.playerCount);
        this.broadcast("playerRejoined", reconnectPlayerObject, {
          except: client,
        });
        //client returned! let's re-activate it.
        // player.connected = true;
      }
    }
    } catch (e) {
      //console.log(e);
      console.log("last round in game leave ", this.lastRound);
      if (!this.lastRound) {
        if (!this.gameOverIndex) {
          if (this.playerCount > 1) {
            let playerColor;
            if (this.gameStarted) {
              if (this.players != null) {
                for (let i = 0; i < this.players.length; i++) {
                  if (this.availablePlayers.includes(i)) {
                    if (client.id == this.players[i].sock.id) {
                      playerColor = this.players[i].playerColor;
                      //console.log(playerColor, " pc & cId ", client.id);
                    }
                  }
                }

                //console.log(" client Left, delete it's gottis1 ", playerColor);
                if (playerColor == "yellow") {
                  //console.log("deleting the yellow player")
                  delete this.games[this.roomIdNo].allGottis[2];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[2];
                } else if (playerColor == "red") {
                  //console.log("deleting the red player")
                  delete this.games[this.roomIdNo].allGottis[0];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[0];
                } else if (playerColor == "green") {
                  //console.log("deleting the green player")
                  delete this.games[this.roomIdNo].allGottis[1];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[1];
                } else if (playerColor == "blue") {
                  //console.log("deleting the blue player")
                  delete this.games[this.roomIdNo].allGottis[3];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[3];
                }

                this.broadcast("playerLeft", {
                  id: client.id,
                  playerColor: playerColor,
                  playerCount: this.maxClients,
                  playerLeftInGame: this.playerCount,
                });
              }

              //delete this.games[this.roomIdNo].allGottis[this.games[this.roomIdNo].playerIndex];
            }
          } else if (this.playerCount == 1) {
            if (this.gameStarted) {
              this.stats.forEach((clientWinner, index) => {
                if (clientWinner.active == true) {
                  var roomData: Array<any> = [
                    this,
                    true,
                    {
                      userId: clientWinner.dbId,
                      rank1: clientWinner.userName,
                      rank1Avatar: clientWinner.avatar,
                    },
                  ];
                  this.tournamentHandler.addGameRoomData(this.roomId, roomData);
                }
              });
              if (this.games[this.roomIdNo].timeOut)
                clearTimeout(this.games[this.roomIdNo].timeOut);
              console.log("game started or not -> ", this.gameStarted);
              this.broadcast("allPlayerLeft", {
                gameStarted: this.gameStarted,
              });
            }

            //this.disconnect();
          }
        }
      } else if (this.lastRound) {
        if (!this.gameOverIndex) {
          console.log("playerCount -> ", this.playerCount);
          var playerCount = this.playerCount + 1;
          if (this.playerCount > 1) {
            let playerColor;
            if (this.gameStarted) {
              if (this.players != null) {
                // for (let i = 0; i < this.players.length; i++) {
                //   if (this.availablePlayers.includes(i)) {
                //     if (client.id == this.players[i].sock.id) {
                //       playerColor = this.players[i].playerColor;
                //       this.winnerUserId[this.playerCount] =
                //         this.players[i].userId;
                //       this.winnerAvatars[this.playerCount] =
                //         this.players[i].avatar;
                //       this.winnerUserNames[this.playerCount] =
                //         this.players[i].userName;
                //       //console.log(playerColor, " pc & cId ", client.id);
                //     }
                //   }
                // }
                let stopBool: boolean = false;
                for (let i = this.winnerUserId.length - 1; i >= 0; i--) {
                  //var ifWinnerOrNot = false;
                  if (
                    this.winnerUserId[i] == null ||
                    this.winnerUserId[i] == undefined ||
                    !this.winnerUserId[i]
                  ) {
                    for (let j = 0; j < this.players.length; j++) {
                      if (this.availablePlayers.includes(j)) {
                        //console.log("winners -> " , this.games[this.roomIdNo].winners[i], " ", this.players[j].playerColor)
                        if (client.id == this.players[j].sock.id) {
                          playerColor = this.players[j].playerColor;
                          this.winnerUserNames[i] = this.players[j].userName;
                          this.winnerUserId[i] = this.players[j].userId;
                          this.winnerAvatars[i] = this.players[j].avatar;
                          stopBool = true;
                          break;
                        }
                      }
                    }
                    if (stopBool) {
                      break;
                    }
                  }
                }
                console.log("winnerArray ->", this.winnerUserId);
                //console.log(" client Left, delete it's gottis1 ", playerColor);
                if (playerColor == "yellow") {
                  //console.log("deleting the yellow player")
                  delete this.games[this.roomIdNo].allGottis[2];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[2];
                } else if (playerColor == "red") {
                  //console.log("deleting the red player")
                  delete this.games[this.roomIdNo].allGottis[0];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[0];
                } else if (playerColor == "green") {
                  //console.log("deleting the green player")
                  delete this.games[this.roomIdNo].allGottis[1];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[1];
                } else if (playerColor == "blue") {
                  //console.log("deleting the blue player")
                  delete this.games[this.roomIdNo].allGottis[3];
                  delete this.games[this.roomIdNo]
                    .allGottisAfterReconnection[3];
                }

                this.broadcast("playerLeft", {
                  id: client.id,
                  playerColor: playerColor,
                  playerCount: this.maxClients,
                  playerLeftInGame: this.playerCount,
                });
              }

              //delete this.games[this.roomIdNo].allGottis[this.games[this.roomIdNo].playerIndex];
            }
          } else if (this.playerCount == 1) {
            var exist = false;
            var gameWinner = false;
            if (this.players != null) {
              for (
                let i = 0;
                i < this.games[this.roomIdNo].winners.length;
                i++
              ) {
                //var ifWinnerOrNot = false;
                for (let j = 0; j < this.players.length; j++) {
                  if (this.availablePlayers.includes(j)) {
                    //console.log("winners -> " , this.games[this.roomIdNo].winners[i], " ", this.players[j].playerColor)
                    if (
                      this.games[this.roomIdNo].winners[i] ==
                      this.players[j].playerColor
                    ) {
                      console.log("found game winner in onLeave ", gameWinner);
                      gameWinner = true;
                      this.winnerUserNames[i] = this.players[j].userName;
                      this.winnerUserId[i] = this.players[j].userId;
                      this.winnerAvatars[i] = this.players[j].avatar;
                    }
                  }
                }
              }
              if (!gameWinner) {
                for (let i = 0; i < this.players.length; i++) {
                  if (this.availablePlayers.includes(i)) {
                    if (client.id == this.players[i].sock.id) {
                      this.winnerUserId[this.playerCount] =
                        this.players[i].userId;
                      this.winnerAvatars[this.playerCount] =
                        this.players[i].avatar;
                      this.winnerUserNames[this.playerCount] =
                        this.players[i].userName;
                      //console.log(playerColor, " pc & cId ", client.id);
                    }
                    console.log("this.winerUserID1 ", this.winnerUserId);
                  }
                }
                for (let i = 0; i < this.players.length; i++) {
                  if (this.availablePlayers.includes(i)) {
                    exist = false;
                    for (
                      var index = 0;
                      index < this.winnerUserId.length;
                      index++
                    ) {
                      console.log(
                        "players user Id ",
                        this.players[i].userId,
                        " winner user Id ",
                        this.winnerUserId[index]
                      );
                      if (this.players[i].userId == this.winnerUserId[index]) {
                        exist = true;
                        break;
                      }
                    }
                    console.log("exist -> ", exist);
                    if (exist == false) {
                      this.winnerUserId[0] = this.players[i].userId;
                      this.winnerAvatars[0] = this.players[i].avatar;
                      this.winnerUserNames[0] = this.players[i].userName;
                    }
                    console.log("this.winerUserID2 ", this.winnerUserId);
                  }
                }
              } else {
                let stopBool: boolean = false;
                for (let i = this.winnerUserId.length - 1; i >= 0; i--) {
                  //var ifWinnerOrNot = false;
                  if (
                    this.winnerUserId[i] == null ||
                    this.winnerUserId[i] == undefined ||
                    !this.winnerUserId[i]
                  ) {
                    for (let j = 0; j < this.players.length; j++) {
                      if (this.availablePlayers.includes(j)) {
                        //console.log("winners -> " , this.games[this.roomIdNo].winners[i], " ", this.players[j].playerColor)
                        if (client.id == this.players[j].sock.id) {
                          this.winnerUserNames[i] = this.players[j].userName;
                          this.winnerUserId[i] = this.players[j].userId;
                          this.winnerAvatars[i] = this.players[j].avatar;
                          stopBool = true;
                          break;
                        }
                      }
                    }
                    if (stopBool) {
                      break;
                    }
                  }
                }
                console.log("winnerArray 6 ->", this.winnerUserId);
                let userId, avatar, name;
                for (let i = 0; i < this.players.length; i++) {
                  if (this.availablePlayers.includes(i)) {
                    exist = false;
                    for (
                      var index = 0;
                      index < this.winnerUserId.length;
                      index++
                    ) {
                      console.log(
                        "players user Id ",
                        this.players[i].userId,
                        " winner user Id ",
                        this.winnerUserId[index]
                      );
                      if (this.players[i].userId == this.winnerUserId[index]) {
                        exist = true;
                        break;
                      }
                    }
                    console.log("exist -> ", exist);
                    if (exist == false) {
                      userId = this.players[i].userId;
                      avatar = this.players[i].avatar;
                      name = this.players[i].userName;
                      break;
                    }
                    console.log("this.winerUserID2 ", this.winnerUserId);
                  }
                }
                for (let i = 0; i < this.winnerUserId.length; i++) {
                  //var ifWinnerOrNot = false;
                  if (
                    this.winnerUserId[i] == null ||
                    this.winnerUserId[i] == undefined ||
                    !this.winnerUserId[i]
                  ) {
                    this.winnerUserNames[i] = name;
                    this.winnerUserId[i] = userId;
                    this.winnerAvatars[i] = avatar;
                    console.log("winnerArray 5->", this.winnerUserId);
                    break;
                  }
                }
              }
            }
            console.log("winnerArray ->", this.winnerUserId);
            if (this.games[this.roomIdNo].timeOut)
              clearTimeout(this.games[this.roomIdNo].timeOut);

            // this.games[this.roomIdNo].players.forEach((player: any) => {
            //if (player)
            if (this.games[this.roomIdNo].timeOut) {
              clearTimeout(this.games[this.roomIdNo].timeOut);
            }

            this.broadcast("tournamentEnded", {
              rank1: this.winnerUserNames[0],
              rank1Avatar: this.winnerAvatars[0],
              rank2: this.winnerUserNames[1],
              rank2Avatar: this.winnerAvatars[1],
              rank3: this.winnerUserNames[2],
              rank3Avatar: this.winnerAvatars[2],
            });
            this.tournamentHandler.saveWinnerDb(
              this.winnerUserId.map((id) => ({ userId: id })),
              this.t_id,
              this.round
            );
            // await this.saveWinnerDb();
            //this.broadcast("allPlayerLeft");
            this.disconnect();
          } else if (this.playerCount == 0) {
            this.disconnect();
          }
        }
      }
    }
  }

  gameOver = async (sock: any) => {
    try {
      if (this.games[this.roomIdNo].timeOut)
        clearTimeout(this.games[this.roomIdNo].timeOut);
      this.games[this.roomIdNo].playerIndex =
        (this.games[this.roomIdNo].playerIndex + 1) % 4;
      while (
        !this.games[this.roomIdNo].allGottisAfterReconnection.hasOwnProperty(
          this.games[this.roomIdNo].playerIndex
        )
      ) {
        this.games[this.roomIdNo].playerIndex =
          (this.games[this.roomIdNo].playerIndex + 1) % 4;
      }
      this.games[this.roomIdNo].winners.push(
        CONSTANTS.defaultColors[this.games[this.roomIdNo].playerIndex]
      );
      console.log("-----------------------w");
      console.log(this.games[this.roomIdNo].winners);
      console.log("-----------------------w");

      if (this.players != null) {
        for (let i = 0; i < this.games[this.roomIdNo].winners.length; i++) {
          //var ifWinnerOrNot = false;
          for (let j = 0; j < this.players.length; j++) {
            if (this.availablePlayers.includes(j)) {
              //console.log("winners -> " , this.games[this.roomIdNo].winners[i], " ", this.players[j].playerColor)
              if (
                this.games[this.roomIdNo].winners[i] ==
                this.players[j].playerColor
              ) {
                this.winnerUserNames[i] = this.players[j].userName;
                this.winnerUserId[i] = this.players[j].userId;
                this.winnerAvatars[i] = this.players[j].avatar;
              }
            }
          }
        }
      }
      console.log("this.winerUserID3 ", this.winnerUserId);

      if (this.games[this.roomIdNo].timeOut) {
        clearTimeout(this.games[this.roomIdNo].timeOut);
      }
      this.gameOverIndex = true;
      this.broadcast("tournamentEnded", {
        rank1: this.winnerUserNames[0],
        rank1Avatar: this.winnerAvatars[0],
        rank2: this.winnerUserNames[1],
        rank2Avatar: this.winnerAvatars[1],
        rank3: this.winnerUserNames[2],
        rank3Avatar: this.winnerAvatars[2],
      });
      this.tournamentHandler.saveWinnerDb(
        this.winnerUserId.map((id) => ({ userId: id })),
        this.t_id,
        this.round
      );
      //await this.saveWinnerDb();
    } catch (e) {
      console.log("error inside gameover", e);
    }
  };
  setEvents() {
    this.onMessage("giveUserArray", (client, message) => {
      let playerColor;
      ////console.log("players----->", this.players, "userName that sent the message", JSON.stringify(message.avatar));
      if (this.players != null) {
        for (let i = 0; i < this.players.length; i++) {
          if (this.availablePlayers.includes(i)) {
            if (client.id == this.players[i].sock.id) {
              playerColor = this.players[i].playerColor;
              this.players[i].userName = message.userName;
              this.players[i].avatar = message.avatar;
              this.players[i].userId = message.userId;
              //console.log(playerColor, " playerColor & userName ", this.players[i].userName);
            }
          }
        }
        this.broadcast("userarray", {
          id: client.id,
          userName: message.userName,
          avatar: message.avatar,
          playerColor: playerColor,
          playerCount: this.playerCount,
        });
      }
    });
    this.onMessage("roll", (client, message) => {
      //console.log("inside roll checking RoomId", this.roomIdNo);
      //console.log("this.games[this.roomIdNo].hasMoved------->",this.games[this.roomIdNo].hasMoved,"-------->",this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex].sock.id,"----------->",client.id)
      if (
        this.games[this.roomIdNo].hasMoved == 1 &&
        this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
          .sock.id === client.id
      ) {
        this.games[this.roomIdNo].players[
          this.games[this.roomIdNo].playerIndex
        ].sock.send("removeGottiShake", "");
        //console.log("roll---------->");
        this.games[this.roomIdNo].makeRoll();
      }
      // this.state.turnIndex = message.playerTurn;
      // client.send("PlayerTurn",{playerTurn: this.state.turnIndex});
    });
    this.onMessage("finishedMoving", (client, message) => {
      //console.log("this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex].sock.id",this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex].sock.id," sockId---->", client.id);
      if (
        this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
          .sock.id == client.id
      ) {
        //console.log("finished moving" + client.id)
        //console.log(message);
        if (message.result != null) {
          if (message.result["gottiHome"]) {
            //console.log("gotti went inside home -> ", message.result['gottiHome']);
            let ind = this.games[this.roomIdNo].gottisOutside[
              this.games[this.roomIdNo].playerIndex
            ].indexOf(message.result["gottiHome"]);
            this.games[this.roomIdNo].gottisOutside[
              this.games[this.roomIdNo].playerIndex
            ].splice(ind, 1);
            delete this.games[this.roomIdNo].allGottis[
              this.games[this.roomIdNo].playerIndex
            ][message.result["gottiHome"]];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[
              this.games[this.roomIdNo].playerIndex
            ][message.result["gottiHome"]];
          }
          if (message.result["gameFinished"] != null) {
            //console.log("all gotti went inside home -> ", message.result['gottiHome']);
            this.games[this.roomIdNo].winners.push(
              this.games[this.roomIdNo].currentPlayerColor
            );
            delete this.games[this.roomIdNo].allGottis[
              this.games[this.roomIdNo].playerIndex
            ];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[
              this.games[this.roomIdNo].playerIndex
            ];
            this.playerCount--;
            this.clientSpectator.push(client.sessionId);
            console.log("client spectator -  ", this.clientSpectator);
            console.log("last round in game overr player ", this.lastRound);
            if (this.lastRound) {
              if (
                Object.keys(this.games[this.roomIdNo].allGottis).length == 1
              ) {
                //console.log("game really done");
                this.gameOver(client);
              } else {
                this.broadcast("RankingOnFinish", {
                  ranking: this.games[this.roomIdNo].winners,
                });
              }
            } else {
              this.stats.forEach((clientWinner) => {
                if (clientWinner.client.id == client.id) {
                  var roomData: Array<any> = [
                    this,
                    true,
                    {
                      userId: clientWinner.dbId,
                      rank1: clientWinner.userName,
                      rank1Avatar: clientWinner.avatar,
                    },
                  ];
                  this.tournamentHandler.addGameRoomData(this.roomId, roomData);
                  this.gameOverIndex = true;
                  this.broadcast("gameOver", {
                    rank1: clientWinner.userName,
                    rank1Avatar: clientWinner.avatar,
                    userId: clientWinner.dbId,
                  });
                }
              });
            }
          }
          if (message.result["killed"]) {
            //console.log("inside Gotti killed finished moving => ", message.result["killed"]);
            let killed = message.result["killed"];
            let ind = -1;
            let killedPlayerIndex = -1;
            for (
              let j = 0;
              j < this.games[this.roomIdNo].gottisOutside.length;
              j++
            ) {
              if (
                this.games[this.roomIdNo].gottisOutside[j].indexOf(killed) !==
                -1
              ) {
                ind =
                  this.games[this.roomIdNo].gottisOutside[j].indexOf(killed);
                killedPlayerIndex = j;
                this.games[this.roomIdNo].gottisOutside[
                  killedPlayerIndex
                ].splice(ind, 1);
                this.games[this.roomIdNo].allGottis[killedPlayerIndex][
                  killed
                ] = 0;
                this.games[this.roomIdNo].allGottisAfterReconnection[
                  killedPlayerIndex
                ][killed] = 0;
                this.games[this.roomIdNo].gottisInside[killedPlayerIndex].push(
                  killed
                );
                break;
              }
            }
          }
        }
        //console.log("chagning turn after player has finished moving");
        this.games[this.roomIdNo].sixCount = 0;
        this.games[this.roomIdNo].playerIndicator();
      }
    });

    this.onMessage("gottiClicked", (client, message) => {
      console.log("moving gotti inside gottiClicked", message.id);
      // if (this.games[this.roomIdNo].isPowerUpRunning && this.games[this.roomIdNo].movableGottis.includes(message.id)) {
      //     //for the kill any gotti powerUp
      //     this.games[this.roomIdNo].isPowerUpRunning = 0;
      //     let ind = -1;
      //     let killedPlayerIndex = -1;
      //     for (let j = 0; j < this.games[this.roomIdNo].gottisOutside.length; j++) {
      //         if (this.games[this.roomIdNo].gottisOutside[j].indexOf(message.id) != -1) {
      //             //console.log("here in gottiClicked0");
      //             ind = this.games[this.roomIdNo].gottisOutside[j].indexOf(message.id);
      //             killedPlayerIndex = j;
      //             break;
      //         }
      //     }
      //     if (ind != -1 && killedPlayerIndex != -1) {
      //         //console.log("here in gottiClicked1");
      //         this.games[this.roomIdNo].gottisOutside[killedPlayerIndex].splice(ind, 1)
      //         this.games[this.roomIdNo].allGottis[killedPlayerIndex][message.id] = 0;
      //         this.games[this.roomIdNo].gottisInside[killedPlayerIndex].push(message.id);
      //         this.games[this.roomIdNo].players.forEach((player:any) => {
      //             if (player) player.send("killGotti", {id: message.id, gamesGottiOut: this.games[this.roomIdNo].gottisOutside});
      //         })
      //         this.games[this.roomIdNo].noPlayerChange = 0;
      //         this.games[this.roomIdNo].playerIndicator();
      //     }
      // } else
      if (Array.isArray(message.id)) {
        console.log("here in gottiClicked2");
        //for when the player clicks at the batta
        for (let i = 0; i < message.id.length; i++) {
          //console.log(message.id[i])
          if (
            message.id[i].includes(
              this.games[this.roomIdNo].currentPlayerColor
            ) &&
            this.games[this.roomIdNo].players[
              this.games[this.roomIdNo].playerIndex
            ].sock.id == client.id &&
            this.games[this.roomIdNo].movableGottis.includes(message.id[i])
          ) {
            //console.log("conditionns true")
            this.games[this.roomIdNo].moveGotti(message.id[i]);
          }
          break;
        }
      } else if (
        this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
          .sock.id == client.id &&
        this.games[this.roomIdNo].movableGottis.includes(message.id)
      ) {
        console.log("here in gottiClicked3");
        // this.games[this.roomIdNo].moveGotti(this.games[this.roomIdNo].movementAmount);
        this.games[this.roomIdNo].moveGotti(message.id);
      } else if (
        this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
          .sock.id == client.id
      ) {
        console.log("here in gottiClicked4");
        // this.games[this.roomIdNo].movementAmount = message.movementAmount;
        // this.games[this.roomIdNo].moveGotti(message.id);
        client.send("moveAgain");
      } //else{
      //     client.send("moveAgain");
      // }
    });
    this.onMessage("gottiClicked1", (client, message) => {
      console.log("moving gotti inside gottiClicked1-1", message.id);
      if (
        this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
          .sock.id == client.id &&
        message.id.includes(this.games[this.roomIdNo].currentPlayerColor)
      ) {
        this.games[this.roomIdNo].sixArray.forEach((movementAmount, index) => {
          if (movementAmount == message.movementAmount) {
            this.games[this.roomIdNo].movementAmount = movementAmount;
            this.games[this.roomIdNo].sixArray.splice(index, 1);
            //console.log("remove the number from array ", this.games[this.roomIdNo].movementAmount);
          }
        });
        console.log("moving gotti inside gottiClicked1-2", message.id);
        this.games[this.roomIdNo].hasMoved = 0;
        this.games[this.roomIdNo].moveGotti(message.id);
      }
    });
    this.onMessage("finishedmovingOnechance", (client, message) => {
      if (
        this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
          .sock.id == client.id
      ) {
        //console.log("finished moving" + client.id)
        //console.log(message);
        if (message.result != null) {
          if (message.result["gottiHome"]) {
            let ind = this.games[this.roomIdNo].gottisOutside[
              this.games[this.roomIdNo].playerIndex
            ].indexOf(message.result["gottiHome"]);
            this.games[this.roomIdNo].gottisOutside[
              this.games[this.roomIdNo].playerIndex
            ].splice(ind, 1);
            delete this.games[this.roomIdNo].allGottis[
              this.games[this.roomIdNo].playerIndex
            ][message.result["gottiHome"]];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[
              this.games[this.roomIdNo].playerIndex
            ][message.result["gottiHome"]];
          }
          if (message.result["gameFinished"] != null) {
            this.games[this.roomIdNo].winners.push(
              this.games[this.roomIdNo].currentPlayerColor
            );
            delete this.games[this.roomIdNo].allGottis[
              this.games[this.roomIdNo].playerIndex
            ];
            delete this.games[this.roomIdNo].allGottisAfterReconnection[
              this.games[this.roomIdNo].playerIndex
            ];
            this.playerCount--;
            this.clientSpectator.push(client.sessionId);
            console.log("client spectator -  ", this.clientSpectator);
            console.log("last round in game overr player1 ", this.lastRound);
            if (this.lastRound) {
              if (
                Object.keys(this.games[this.roomIdNo].allGottis).length == 1
              ) {
                //console.log("game really done");
                this.gameOver(client);
              } else {
                this.broadcast("RankingOnFinish", {
                  ranking: this.games[this.roomIdNo].winners,
                });
              }
            } else {
              this.stats.forEach((clientWinner) => {
                if (clientWinner.client.id == client.id) {
                  var roomData: Array<any> = [
                    this,
                    true,
                    {
                      userId: clientWinner.dbId,
                      rank1: clientWinner.userName,
                      rank1Avatar: clientWinner.avatar,
                    },
                  ];
                  this.tournamentHandler.addGameRoomData(this.roomId, roomData);
                  this.gameOverIndex = true;
                  this.broadcast("gameOver", {
                    rank1: clientWinner.userName,
                    rank1Avatar: clientWinner.avatar,
                  });
                }
              });
            }
          }
          if (message.result["killed"]) {
            //console.log("inside Gotti killed finished moving one chance => ", message.result["killed"]);
            let killed = message.result["killed"];
            let ind = -1;
            let killedPlayerIndex = -1;
            for (
              let j = 0;
              j < this.games[this.roomIdNo].gottisOutside.length;
              j++
            ) {
              if (
                this.games[this.roomIdNo].gottisOutside[j].indexOf(killed) !==
                -1
              ) {
                ind =
                  this.games[this.roomIdNo].gottisOutside[j].indexOf(killed);
                killedPlayerIndex = j;
                this.games[this.roomIdNo].gottisOutside[
                  killedPlayerIndex
                ].splice(ind, 1);
                this.games[this.roomIdNo].allGottis[killedPlayerIndex][
                  killed
                ] = 0;
                this.games[this.roomIdNo].allGottisAfterReconnection[
                  killedPlayerIndex
                ][killed] = 0;
                this.games[this.roomIdNo].gottisInside[killedPlayerIndex].push(
                  killed
                );
                break;
              }
            }
          }
        }
        //console.log("finished moving one piece move another one");
        this.games[this.roomIdNo].checkIfmoveCanbeMade();
        if (this.games[this.roomIdNo].sixArray.length) {
          this.games[this.roomIdNo].movePlayerGottis();
        } else {
          console.log("changing turn due to no piece could be moved");
          this.games[this.roomIdNo].sixCount = 0;
          this.games[this.roomIdNo].playerIndicator();
        }
      }
    });
    //end of setEvents
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose() {
    // try {
    //   if (this.games[this.roomIdNo].timeOut) {
    //     clearTimeout(this.games[this.roomIdNo].timeOut);
    //   }
    // } catch (e) {
    //   console.log("here in e", e);
    // }
    //console.log("room on disposed");
  }
  reset() {
    this.playerCount = 0;
    this.availablePlayers = [];
    this.playersInGame = {};
    this.gameLobby = [];
    this.roomIdNo = 0;
    this.games = {};
    this.games[this.roomIdNo] = null;
    this.num = 0;
    this.players = {};
    // this.countForUserColor = 0;
  }
}
