import { Room, Client, Delayed } from "colyseus";
import { State } from "./GamePlay/GameState";
import { LudoPlayer } from "./GamePlay/LudoPlayer";
import { Player } from "./GamePlay/Player";
import { Card } from "../typings/Card";
import { Events } from "./events";
import { AIGame } from "./GamePlay/AIGameClass";
import { HttpClient } from "typed-rest-client/HttpClient";
const CONSTANTS = {
  defaultColors: ["red", "green", "yellow", "blue"],
  //defaultColors: ['blue', 'yellow', 'green', 'red']
};
//let playersInGame = {};
export class AIGameRoom extends Room<State> {
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
  gameLobby = {
    2: [],
    3: [],
    4: [],
  };
  availablePlayers = [];
  playersInGame = {};
  //availablePlayers: number[];
  num: number;
  players: any;
  winnerUserNames = [];
  winnerAvatars = [];
  winnerUserId = [];
  looserId: number;
  playeWinnerIndex: number;
  // countForUserColor: number;
  gameOverIndex: boolean = false;
  clientSpectator: any[] = [];
  onCreate(options: any) {
    //this.reset();
    console.log("create game room", options);
    this.num = 2;
    this.maxClients = 2;
    this.betAmount = 0;
    this.setSeatReservationTime(600);
    this.setState(new State());
    this.eventHandler = new Events(this);
    this.setEvents();
    //console.log("game room created")
  }

  // When client successfully join the room
  onJoin(client: Client, options: any) {
    try {
      client.send("yourId", { id: client.id });
      this.playerCount++;
      
      let p = new LudoPlayer(client);
      let AIp = new LudoPlayer({
        roomId: "",
        id:"AI",
        playerIndex: 0,
      });
      let player = new Player(client, {
        userId: options.dbId,
        coin: 0,
        userName: options.userName,
        avatar: options.avatar.toString(),
        team: options.team,
      });
      this.playersInGame[client.id] = p;
      this.playersInGame["AI"] = AIp;
      this.state.players[client.sessionId] = player;
      var num = this.num;
      console.log("type---------->", num, " -------->", client.id);
      this.gameLobby[num].push(this.playersInGame["AI"]);
      this.gameLobby[num].push(this.playersInGame[client.id]);
      
      ////console.log("client-----",client);
      if (this.gameLobby[num].length == num) {
        //this.lock();
        this.roomIdNo++;
        this.availablePlayers = [0, 1, 2, 3];
        if (num == 2) {
          this.availablePlayers = [0, 2];
        } else if (num == 3) {
          this.availablePlayers = [0, 2, 3];
        }
        //console.log("gameLobby -----> ", JSON.stringify(this.gameLobby[num]));
        this.gameLobby[num].forEach((element: any, index: any) => {
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
        let g = new AIGame(this.gameLobby[num], this);
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
            //player.color = CONSTANTS.defaultColors[i];
          }
        }
        this.players = g.players;
        g.players.forEach((player: any) => {
          ////console.log("Player--------->", player);

          if (player != null && player.sock.id != "AI") {
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
          }else if(g.players[i] && !g.players[i].WebSocketClient){
            playerIds.push(g.players[i].sock.id);
            names.push(g.players[i].sock.id);
          } else {
            playerIds.push(0);
            names.push("");
          }
        }
        //console.log("Outside StartGame");
        // client.send("userArraysent",{});

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
          this.games[this.roomIdNo].playerIndicator();
        }, 1500);
        // let Timeout1 = setInterval(()=>{
        //     //console.log("this here in timeout1");
        //      this.games[this.roomIdNo].noPlayerChange = 0;
        //     this.games[this.roomIdNo].playerIndicator();
        // },15000);
        this.gameLobby[num] = [];
      }
    } catch (e) {
      //console.log("on join error >>>>>>>>>>", e);
    }
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
        console.log("decrease player count when player is not a spectator ");
      }
      console.log("playerCount 1 - ", this.playerCount);
      let player = this.getPlayer(client).player;
      player.connected = false;
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
          // for (let i = 0; i < this.players.length; i++) {
          //   if (this.availablePlayers.includes(i)) {
          //     if (client.id == this.players[i].sock.id) {
          //       playerColor = this.players[i].playerColor;
          //       playerIndex = i;
          //       console.log(playerColor, " pc & cId ", client.id);
          //     }
          //   }
          // }
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
        // allow disconnected client to reconnect into this room until 5 seconds
        await this.allowReconnection(client, 15);
        player.connected = true;
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
    } catch (e) {
      console.log("error -> ", e);
      if(this.games[this.roomIdNo].timeout) {
        clearTimeout(this.games[this.roomIdNo].timeout);
      }
      this.disconnect();
    }
  }

  // async saveWinnerDb() {
  //   try {
  //     let param: any;
  //     var winAmount: number =
  //       this.maxClients * this.betAmount -
  //       this.maxClients * this.betAmount * 0.35;
  //     winAmount = winAmount - winAmount * 0.1;
  //     console.log("WinnersAmount", winAmount, this.betAmount);
  //     if (this.maxClients == 4) {
  //       param = [
  //         {
  //           userId: this.winnerUserId[0],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: winAmount,
  //           winCurrency: "Coin",
  //           position: 1,
  //           roomId: this.roomId,
  //         },
  //         {
  //           userId: this.winnerUserId[1],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: 0,
  //           winCurrency: "Coin",
  //           position: 2,
  //           roomId: this.roomId,
  //         },
  //         {
  //           userId: this.winnerUserId[2],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: 0,
  //           winCurrency: "Coin",
  //           position: 3,
  //           roomId: this.roomId,
  //         },
  //         {
  //           userId: this.winnerUserId[3],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: 0,
  //           winCurrency: "Coin",
  //           position: 4,
  //           roomId: this.roomId,
  //         },
  //       ];
  //     } else if (this.maxClients == 3) {
  //       param = [
  //         {
  //           userId: this.winnerUserId[0],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: winAmount,
  //           winCurrency: "Coin",
  //           position: 1,
  //           roomId: this.roomId,
  //         },
  //         {
  //           userId: this.winnerUserId[1],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: 0,
  //           winCurrency: "Coin",
  //           position: 2,
  //           roomId: this.roomId,
  //         },
  //         {
  //           userId: this.winnerUserId[2],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: 0,
  //           winCurrency: "Coin",
  //           position: 3,
  //           roomId: this.roomId,
  //         },
  //       ];
  //     } else if (this.maxClients == 2) {
  //       param = [
  //         {
  //           userId: this.winnerUserId[0],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: winAmount,
  //           winCurrency: "Coin",
  //           position: 1,
  //           roomId: this.roomId,
  //         },
  //         {
  //           userId: this.winnerUserId[1],
  //           gameType: "Ludo",
  //           bet_amount: this.betAmount,
  //           win_amount: 0,
  //           winCurrency: "Coin",
  //           position: 2,
  //           roomId: this.roomId,
  //         },
  //       ];
  //     }
  //     console.log("param -> ", param);
  //     let dataString = JSON.stringify(param);
  //     let _http: HttpClient = new HttpClient("typed-test-client-tests");
  //     //process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
  //     let finalUrl =
  //       "https://admin.mojogos.ao:8443/payment-gateway-service/saveTransactionDetails";
  //     const res = await _http.post(finalUrl, dataString, {
  //       header: "",
  //       "Content-Type": "application/json",
  //     });

  //     let body: string = String(await res.readBody());
  //     console.log("Server response of saving winner-> ", body);
  //     //this.broadcast("winner",{winner: this.winnerName});
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }
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
      this.broadcast("gameOver", {
        rank1: this.winnerUserNames[0],
        rank1Avatar: this.winnerAvatars[0],
        rank2: this.winnerUserNames[1],
        rank2Avatar: this.winnerAvatars[1],
        rank3: this.winnerUserNames[2],
        rank3Avatar: this.winnerAvatars[2],
      });
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
          playerCount: this.maxClients,
        });
        for (let i = 0; i < this.players.length; i++) {
          if (this.availablePlayers.includes(i)) {
            if (this.players[i].sock.id == "AI") {
              playerColor = this.players[i].playerColor;
              this.players[i].userName = "AI";
              this.players[i].avatar = "0";
              this.players[i].userId = "AI";
              //console.log(playerColor, " playerColor & userName ", this.players[i].userName);
            }
          }
        }
        client.send("userarray",{
          id: "AI",
          userName: "Mojo",
          avatar: "0",
          playerColor: playerColor,
          playerCount: this.maxClients,
        })
      }
    });
    this.onMessage("roll", (client, message) => {
      //console.log("inside roll checking RoomId", this.roomIdNo);
      //console.log("this.games[this.roomIdNo].hasMoved------->",this.games[this.roomIdNo].hasMoved,"-------->",this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex].sock.id,"----------->",client.id)
      if (
        this.games[this.roomIdNo].hasMoved == 1 &&
        this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
          .sock.id === client.id && this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex].sock.id !== "AI"
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
      console.log("this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex].sock.id",this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex].sock.id," sockId---->", client.id);
      // if (
      //   this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
      //     .sock.id == client.id
      // ) {
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
            if (Object.keys(this.games[this.roomIdNo].allGottis).length == 1) {
              this.gameOver(client);
            } else {
              this.broadcast("RankingOnFinish", {
                ranking: this.games[this.roomIdNo].winners,
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
      //}
    });

    this.onMessage("gottiClicked", (client, message) => {
      console.log("moving gotti inside gottiClicked", message.id);
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
      console.log("finished moving" + client.id);
      // if (
      //   this.games[this.roomIdNo].players[this.games[this.roomIdNo].playerIndex]
      //     .sock.id == client.id
      // ) {
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
            if (Object.keys(this.games[this.roomIdNo].allGottis).length == 1) {
              //console.log("game really done");
              this.gameOver(client);
            } else {
              this.broadcast("RankingOnFinish", {
                ranking: this.games[this.roomIdNo].winners,
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
      //}
    });
    //end of setEvents
  }

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

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose() {
    if (this.games[this.roomIdNo] != undefined) {
      if (this.games[this.roomIdNo].timeOut)
        clearTimeout(this.games[this.roomIdNo].timeOut);
    }
    console.log("room on disposed");
  }
  reset() {
    this.playerCount = 0;
    this.availablePlayers = [];
    this.playersInGame = {};
    this.gameLobby = {
      2: [],
      3: [],
      4: [],
    };
    this.roomIdNo = 0;
    this.games = {};
    this.games[this.roomIdNo] = null;
    this.num = 0;
    this.players = {};
    // this.countForUserColor = 0;
  }
}
