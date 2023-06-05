import { Room, matchMaker, Client } from "colyseus";
// import {  State} from './State';

import { Events } from "./events";
import { Game } from "./GamePlay/game";
import { IHeaders } from "typed-rest-client/Interfaces";

import { MapSchema } from "@colyseus/schema";
const schema = require("@colyseus/schema");
const { defineTypes, Schema } = schema;

export class Player extends Schema {
  players: MapSchema<Player> = new MapSchema<Player>();
  phase: string;
}

export class State extends Schema {
  players: MapSchema<Player> = new MapSchema<Player>();
  phase: string;
}

interface MatchmakingGroup {
  averagePoints: number;
  clients: ClientStat[];
  priority?: boolean;
  playerCount?: number;
  ready?: boolean;
  confirmed?: number;
  active?: boolean;

  // cancelConfirmationTimeout?: Delayed;
}

interface ClientStat {
  client: Client;

  waitingTime: number;
  options?: any;
  group?: MatchmakingGroup;
  coin: number;
  dbId: number;
  confirmed?: boolean;
  userName: string;
  avatar: string;
}

defineTypes(State, {
  whatever: "string",
});

export interface IRequestOptions {
  // defaults to application/json
  // common versioning is application/json;version=2.1
  acceptHeader?: string;
  // since accept is defaulted, set additional headers if needed
  additionalHeaders?: IHeaders;

  responseProcessor?: Function;
  //Dates aren't automatically deserialized by JSON, this adds a date reviver to ensure they aren't just left as strings
  deserializeDates?: boolean;
}

export class playWithFriends extends Room<State> {
  /**
   * after this time, create a match with a bot
   */
  gameLobby = {
    2: [],
    3: [],
    4: [],
  };
  availablePlayers = [];
  playersInGame = {};
  maxWaitingTime = 15 * 1000;

  /**
   * after this time, try to fit this client with a not-so-compatible group
   */
  maxWaitingTimeForPriority?: number = 10 * 1000;

  /**
   * number of players on each match
   */
  numClientsToMatch = 0;

  /**
   * Groups of players per iteration
   */
  matchingGroups: MatchmakingGroup[] = [];

  /**
   * If `allowUnmatchedGroups` is true, players inside an unmatched group (that
   * did not reached `numClientsToMatch`, and `maxWaitingTime` has been
   * reached) will be matched together. Your room should fill the remaining
   * spots with "bots" on this case.
   */
  allowUnmatchedGroups: boolean = true;
  /**
   * Evaluate groups for each client at interval
   */
  evaluateGroupsInterval = 1000;

  /**
   * name of the room to create
   */
  roomToCreate = "game";

  /**
   * coin and group cache per-player
   */
  stats: ClientStat[] = [];

  // maxClients = 100;
  playerCount: number = 0;

  playerBidsRecieved: number = 0;
  eventHandler: Events;
  activePlayerIndex: number = 0;
  userName: string;
  client1: any;
  client2: any;
  client3: any;
  client4: any;
  recreateGroup: any;
  betAmount: number;
  rewards: any;
  entry: any;
  hostSessionId: string = "";
  startGameBool: boolean = false;
  onCreate(options) {
    this.reset();
    this.eventHandler = new Events(this);
    this.setEvents();
    this.betAmount = parseFloat(options.coin);
    console.log("Create lobby");
    if (options.maxWaitingTime) {
      this.maxWaitingTime = options.maxWaitingTime;
    }
    if (options.entry && options.reward) {
      this.entry = options.entry;
      this.rewards = options.reward;
    }
    let num = parseInt(options.playerCount);

    this.numClientsToMatch = num;
    console.log("Create lobby for ", num, " players.");

    /**
     * Redistribute clients into groups at every interval
     */
    this.recreateGroup = setInterval(
      () => this.recreateGroups(),
      this.evaluateGroupsInterval
    );
  }

  onJoin(client: Client, options: any) {
    console.log("inside onJoin---------?");
    try {
      this.playerCount++;
      if (this.playerCount == 1) {
        this.hostSessionId = client.sessionId;
      }
      if (this.playerCount > this.numClientsToMatch) {
        client.send("roomFull");
      } else if (this.betAmount > options.coin) {
        client.send("lessAmount");
      } else {
        client.send("roomId", {
          roomCode: this.roomId,
          entry: this.entry,
          rewards: this.rewards,
        });
        let ifExist = this.stats.filter((stat) => stat.dbId === options.dbId);
        if (ifExist.length) throw new Error("DUPLICATE_USER");

        this.userName = options.userName;
        this.stats.push({
          client: client,
          coin: this.betAmount,
          waitingTime: 0,
          dbId: parseInt(options.dbId),
          userName: options.userName,
          avatar: JSON.stringify(options.avatar),
          options,
        });

        let num = parseInt(options.playerCount);
        //this.numClientsToMatch = num;
        // console.log("Number of Players to match  = > ", options.playerCount);
        if (this.playerCount == 2) {
          let opponentInfo: ClientStat = this.stats.find(
            (item) => item.client != client
          );
          this.broadcast("playerJoined", {
            playerCount: this.playerCount,
            oppName: opponentInfo.userName,
            oppAvatar: opponentInfo.avatar,
          });
          //console.log("opponentInfo =====> ", opponentInfo);
        } else if (this.playerCount == 3) {
          let opponentInfo: ClientStat = this.stats.find(
            (item) => item.client != client
          );
          let opponentInfo1: ClientStat = this.stats.find(
            (item) => item.client != client && item != opponentInfo
          );
          this.broadcast("playerJoined", {
            playerCount: this.playerCount,
            oppName: opponentInfo.userName,
            oppAvatar: opponentInfo.avatar,
            oppName1: opponentInfo1.userName,
            oppAvatar1: opponentInfo1.avatar,
          });
          //console.log("opponentInfo =====> ", opponentInfo);
        } else if (this.playerCount == 4) {
          let opponentInfo: ClientStat = this.stats.find(
            (item) => item.client != client
          );
          let opponentInfo1: ClientStat = this.stats.find(
            (item) => item.client != client && item != opponentInfo
          );
          let opponentInfo2: ClientStat = this.stats.find(
            (item) =>
              item.client != client &&
              item != opponentInfo &&
              item != opponentInfo1
          );
          this.broadcast("playerJoined", {
            playerCount: this.playerCount,
            oppName: opponentInfo.userName,
            oppName1: opponentInfo1.userName,
            oppName2: opponentInfo2.userName,
            oppAvatar: opponentInfo.avatar,
            oppAvatar1: opponentInfo1.avatar,
            oppAvatar2: opponentInfo2.avatar,
          });
          //console.log("opponentInfo =====> ", opponentInfo);
        }

        client.send("waitingForPlayers", {
          num: num,
          sessionId: client.id,
        });
        if (this.playerCount == this.numClientsToMatch) {
          this.lock();
        }
      }
    } catch (e) {
      console.log("Error in onJoin >>>>", e);
    }
  }

  addToGroup(client: ClientStat) {
    let bool = false;

    this.matchingGroups.forEach((element) => {
      //console.log("Elment Info: "+element.clients.length);
      if (bool == true) {
        return;
      }
      console.log("Group Status: " + element.active);
      if (element.averagePoints == client.coin && element.active) {
        console.log("Adding to existing");
        element.clients.push(client);
        bool = true;
      }
    });
    if (bool == false) {
      console.log("Creating Group");
      let group: MatchmakingGroup = {
        clients: [client],
        averagePoints: client.coin,
        active: true,
      };
      this.matchingGroups.push(group);
    }
  }

  recreateGroups() {
    console.log("recreate groups starts>>>>");
    // re-set all groups

    this.matchingGroups = [];

    //console.log("Redistribute group: "+ this.stats.length);

    const stats = this.stats.sort((a, b) => a.coin - b.coin);

    let currentGroup: MatchmakingGroup; //= this.createGroup(this.stats);
    //console.log("Current Group: "+ this.stats);

    let totalPoints = 0;
    console.log("stats.length", stats.length);
    for (let i = 0, l = stats.length; i < l; i++) {
      const stat: ClientStat = stats[i];
      console.log("State player info? ");
      stat.waitingTime += this.clock.deltaTime;

      /**
       * do not attempt to re-assign groups for clients inside "ready" groups
       */

      this.addToGroup(stat);
    }

    this.matchingGroups.forEach((currentGroup) => {
      console.log("currentGroup Length--", currentGroup.clients.length);
      console.log("Number of clients ", this.numClientsToMatch);
      if (currentGroup.clients.length == this.numClientsToMatch) {
        currentGroup.ready = true;
        currentGroup.confirmed = 0;
        totalPoints = 0;
        console.log("currentGroup Length ", currentGroup.clients.length);
        console.log("Number of clients ", this.numClientsToMatch);
      }
    });
    //     currentGroup.clients.forEach(clientItem => {
    //         clientItem.client.send("JOINFINAL", {
    //             oppJoinedLobby: true,
    //             oppJoinedName: clientItem.userName,
    //             oppJoinedAvatar: clientItem.avatar,
    //             gamePlayerList: GamePlayer
    //         });
    //     });
    //     if (currentGroup.clients.length === currentGroup.playerCount) {
    //         currentGroup.ready = true;
    //         currentGroup.confirmed = 0;
    //         totalPoints = 0;
    //     }
    // });

    this.checkGroupsReady();
    console.log("recreate groups starts ends>>>>");
  }

  async checkGroupsReady() {
    await Promise.all(
      this.matchingGroups.map(async (group) => {
        console.log("check if groups ready", group.ready);
        if (group.ready) {
          console.log("Inside checkGroupsReady promise");
          group.ready = true;
          group.confirmed = 1;

          /**
           * Create room instance in the server.
           */
          console.log("player count in ", this.numClientsToMatch);
          const room = await matchMaker.createRoom(this.roomToCreate, {
            betAmount: this.betAmount,
            userName: this.userName,
            playerCount: this.numClientsToMatch,
          });
          var info = {
            roomId: room.roomId,
            gameMode: "2",
            attributeType: "-1",
            bidAmount: group.averagePoints,
          };
          let GamePlayer = [];

          let pos;
          await Promise.all(
            group.clients.map(async (client) => {
              //const matchData = await matchMaker.reserveSeatFor(room, client.options);

              /**
               * Send room data for new WebSocket connection!
               */

              const index = this.stats.findIndex(
                (stat) => stat.client === client.client
              );
              this.stats.splice(index, 1);

              console.log("stats length >>>>>>", this.stats.length);
              let item = {
                sessionId: client.client.sessionId,
                dbId: client.dbId,
              };
              GamePlayer.push(item);

              let userIndex = null;

              console.log("groups ------> ", group.clients);

              if (this.numClientsToMatch == 2) {
                let opponentInfo: ClientStat = group.clients.find(
                  (item) => item.client != client.client
                );
                console.log(
                  "Opponent Info: " +
                    opponentInfo.dbId +
                    " name: " +
                    opponentInfo.userName
                );
                // const matchData = await matchMaker.reserveSeatFor(room, {
                //   coin: client.coin,
                //   dbId: client.dbId,
                //   userName: client.userName,
                //   avatar: client.avatar,
                //   userIndex: userIndex,
                //   type: "SEAT",
                // });
                console.log("roomID -> ", room.roomId);
                client.client.send("ROOMCONNECT", {
                  roomId: room.roomId,
                  //seat: matchData,
                  // sessionId: client.client.sessionId,
                  userIndex: userIndex,
                  oppName: opponentInfo.userName,
                  oppAvatar: opponentInfo.avatar,
                  playerCount: this.numClientsToMatch,
                  // oppdbId: opponentInfo.dbId,
                  oppSessionId: this.state.players[client.client.id],
                  //type: "SEAT",
                });
              } else if (this.numClientsToMatch == 3) {
                let opponentInfo: ClientStat = group.clients.find(
                  (item) => item.client != client.client
                );
                let opponentInfo1: ClientStat = group.clients.find(
                  (item) => item.client != client.client && item != opponentInfo
                );
                console.log(
                  "Opponent Info: " +
                    opponentInfo.dbId +
                    " name: " +
                    opponentInfo.userName
                );
                // const matchData = await matchMaker.reserveSeatFor(room, {
                //   coin: client.coin,
                //   dbId: client.dbId,
                //   userName: client.userName,
                //   avatar: client.avatar,
                //   userIndex: userIndex,
                //   type: "SEAT",
                // });
                console.log("roomID -> ", room.roomId);
                client.client.send("ROOMCONNECT", {
                  roomId: room.roomId,
                  //seat: matchData,
                  // sessionId: client.client.sessionId,
                  userIndex: userIndex,
                  oppName: opponentInfo.userName,
                  oppName1: opponentInfo1.userName,
                  oppAvatar: opponentInfo.avatar,
                  oppAvatar1: opponentInfo1.avatar,
                  playerCount: this.numClientsToMatch,
                  // oppdbId: opponentInfo.dbId,
                  oppSessionId: this.state.players[client.client.id],
                  //type: "SEAT",
                });
              } else if (this.numClientsToMatch == 4) {
                console.log("four player roomConnect -> ");
                let opponentInfo: ClientStat = group.clients.find(
                  (item) => item.client != client.client
                );
                let opponentInfo1: ClientStat = group.clients.find(
                  (item) => item.client != client.client && item != opponentInfo
                );
                let opponentInfo2: ClientStat = group.clients.find(
                  (item) =>
                    item.client != client.client &&
                    item != opponentInfo &&
                    item != opponentInfo1
                );
                console.log(
                  "Opponent Info: " +
                    opponentInfo.dbId +
                    " name: " +
                    opponentInfo.userName
                );
                console.log(
                  "Opponent Info: " +
                    opponentInfo1.dbId +
                    " name: " +
                    opponentInfo1.userName
                );
                console.log(
                  "Opponent Info: " +
                    opponentInfo2.dbId +
                    " name: " +
                    opponentInfo2.userName
                );
                // const matchData = await matchMaker.reserveSeatFor(room, {
                //   coin: client.coin,
                //   dbId: client.dbId,
                //   userName: client.userName,
                //   avatar: client.avatar,
                //   userIndex: userIndex,
                //   type: "SEAT",
                // });
                console.log("roomID -> ", room.roomId);
                client.client.send("ROOMCONNECT", {
                  roomId: room.roomId,
                  //seat: matchData,
                  // sessionId: client.client.sessionId,
                  userIndex: userIndex,
                  oppName: opponentInfo.userName,
                  oppName1: opponentInfo1.userName,
                  oppName2: opponentInfo2.userName,
                  oppAvatar: opponentInfo.avatar,
                  oppAvatar1: opponentInfo1.avatar,
                  oppAvatar2: opponentInfo2.avatar,
                  playerCount: this.numClientsToMatch,
                  // oppdbId: opponentInfo.dbId,
                  oppSessionId: this.state.players[client.client.id],
                  //type: "SEAT",
                });
              }
              // client.client.send(room.roomId);
              console.log("after ROOMCONNECT");
            })
          );
        } else {
          console.log("here in the else checkGroupsReady");
        }
      })
    );
  }

  onLeave(client: Client, consented: boolean) {
    try {
      this.playerCount--;

      console.log("client left", client.sessionId);
      if (this.hostSessionId == client.sessionId && consented) {
        if (this.startGameBool == false) this.broadcast("hostLeft");
      }
      let index = -1;
      index = this.stats.findIndex(
        (stat) => stat.client.sessionId === client.sessionId
      );
      if (index >= 0) {
        console.log("Index: " + index);
        this.stats.splice(index, 1);
      } else {
      }

      this.matchingGroups.filter((obj) => {
        if (obj.clients[0].client.sessionId === client.sessionId) {
          console.log("Group Info: " + obj.averagePoints);
          obj.active = false;
          return obj;
        }
      });
    } catch (err) {
      console.log(" error in pwf -> ", err);
    }
  }

  setEvents() {
    this.onMessage("startGame", (client, message) => {
      console.log("startGame and Go to next sscreen", message);
      console.log("player count in start game", this.playerCount);
      if (this.playerCount == 1) {
        client.send("allPlayerLeftPWF");
      } else {
        this.broadcast("startgame");
        this.startGameBool = true;
      }
    });
  }

  onDispose() {
    if (this.recreateGroup) clearInterval(this.recreateGroup);
    console.log("lobby destroyed!");
  }

  reset() {
    let state = new State();
    this.playerCount = 0;
    state.phase = "waiting";

    this.setState(state);
  }
}
