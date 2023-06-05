import { Room, matchMaker, Client } from "colyseus";
// import {  State} from './State';
//import {SingletonClass} from './GamePlay/tournamentHandler'
import { Events } from "./events";
import { Game } from "./GamePlay/game";
import { IHeaders } from "typed-rest-client/Interfaces";

import { MapSchema } from '@colyseus/schema';
const schema = require('@colyseus/schema');
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
    clients: ClientStat[],
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
    whatever: "string"
});

export interface IRequestOptions {
    // defaults to application/json
    // common versioning is application/json;version=2.1
    acceptHeader?: string,
    // since accept is defaulted, set additional headers if needed
    additionalHeaders?: IHeaders,

    responseProcessor?: Function,
    //Dates aren't automatically deserialized by JSON, this adds a date reviver to ensure they aren't just left as strings
    deserializeDates?: boolean
}


export class ludo2PlayerLobbyRoom extends Room<State> {

    /**
     * after this time, create a match with a bot
     */
    recreateGroup: any;
    gameLobby = {
        2: [],
        3: [],
        4: []
    }
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
    numClientsToMatch = 2;

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
    createGroupOrJoinGroup: boolean = false;
    playerCountincurrentGroup: number = 0;
    client1: any;
    client2: any;
    client3: any;
    client4: any;
    onCreate( options ) {

        this.reset();
        this.eventHandler = new Events(this);

        console.log("Create lobby");
        if (options.maxWaitingTime) {
            this.maxWaitingTime = options.maxWaitingTime;
        }

        // if (options.numClientsToMatch) {
        //     let num = parseInt(options.playerCount);

        //     this.numClientsToMatch = num;
        //     console.log("Create lobby for ", num ," players.");
        // }

        /**
         * Redistribute clients into groups at every interval
         */
        this.recreateGroup = setInterval(() => this.recreateGroups(), this.evaluateGroupsInterval);

    }

    onJoin(client: Client, options: any) {
        // var scoreManager = SingletonClass.getInstance();
        // // scoreManager.setScore(10);
        // // scoreManager.addPoints(1);
        // // scoreManager.removePoints(2);
        // // console.log( scoreManager.getScore() );
        // scoreManager.addroomData('123_1_' + this.roomId, this);
        console.log("inside onJoin---------? ", this.roomId);
        try {
            
            let ifExist = this.stats.filter(stat => stat.dbId === options.dbId);
            if (ifExist.length)
                throw new Error("DUPLICATE_USER");

                this.userName = options.userName
            this.stats.push({
                client: client,
                coin: parseFloat(options.coin),
                waitingTime: 0,
                dbId: parseInt(options.dbId),
                userName: options.userName,
                avatar: JSON.stringify(options.avatar),
                options
            });
            this.playerCount++;
            let num = parseInt(options.playerCount);
            // this.numClientsToMatch = num;
            console.log("Number of Players to match  = > ", options.playerCount);
            
            client.send('waitingForPlayers', {
                   num : num,
                   sessionId: client.id, 
            });
            
        } catch (e) {
            console.log("Error in onJoin >>>>", e);
        }


    }

    addToGroup(client: ClientStat) {

        this.createGroupOrJoinGroup = false;

      this.matchingGroups.forEach(element => {

          //console.log("Elment Info: "+element.clients.length);
          if (this.createGroupOrJoinGroup == true) {
              return;
          }
          console.log("Group Status: "+ element.active);
          if (element.averagePoints === client.coin && element.active) {
              console.log("Adding to existing");
              element.clients.push(client);
              this.createGroupOrJoinGroup = true;
              this.playerCountincurrentGroup++;
          }
          
      });
      if (this.createGroupOrJoinGroup == false) {
          console.log("Creating Group");
          let group: MatchmakingGroup = {
              clients: [client],
              averagePoints: client.coin,
              active : true
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

        this.matchingGroups.forEach(currentGroup => {
            console.log("currentGroup Length--",currentGroup.clients.length);

            console.log("Number of clients ", this.numClientsToMatch);
            if (currentGroup.clients.length == this.numClientsToMatch) {
                currentGroup.ready = true;
                currentGroup.confirmed = 0;
                totalPoints = 0;
                console.log("currentGroup Length ", currentGroup.clients.length);
                console.log("Number of clients ", this.numClientsToMatch);
                
            }
        });

        this.checkGroupsReady();
        console.log("recreate groups starts ends>>>>");
    }

    async checkGroupsReady() {

        await Promise.all(
            this.matchingGroups
                .map(async (group) => {
                    console.log("check if groups ready", group.ready);
                    if (group.ready) {
                        console.log("Inside checkGroupsReady promise");
                        group.ready = true;
                        group.confirmed = 1;

                        /**
                         * Create room instance in the server.
                         */
                        const room = await matchMaker.createRoom(this.roomToCreate, {
                            betAmount: group.averagePoints,
                            userName: this.userName,
                            playerCount: this.numClientsToMatch
                        });
                        console.log("room variable ",room);
                        var info = {
                            roomId: room.roomId,
                            gameMode: "2",
                            attributeType: "-1",
                            bidAmount: group.averagePoints
                        };
                        let GamePlayer = [];
                        
                        let pos;
                        await Promise.all(group.clients.map(async (client) => {
                            //const matchData = await matchMaker.reserveSeatFor(room, client.options);

                            /**
                             * Send room data for new WebSocket connection!
                             */

                            const index = this.stats.findIndex(stat => stat.client === client.client);
                            this.stats.splice(index, 1);

                            console.log("stats length >>>>>>", this.stats.length);
                            let item = {
                                sessionId: client.client.sessionId,
                                dbId: client.dbId
                            }
                            GamePlayer.push(item);
                            
                            let userIndex = null;

                            console.log("groups ------> ", group.clients);

                            if(this.numClientsToMatch == 2){
                            let opponentInfo: ClientStat = group.clients.find(item => item.client != client.client);
                            console.log("Opponent Info: " + opponentInfo.dbId + " name: " + opponentInfo.userName);
                            // const matchData = await matchMaker.reserveSeatFor(room, {
                            //     coin: client.coin,
                            //     dbId: client.dbId,
                            //     userName: client.userName,
                            //     avatar: client.avatar,
                            //     userIndex: userIndex,
                            //     type: "SEAT"
                            // });

                            client.client.send('ROOMCONNECT', {
                                roomId: room.roomId,
                                //seat: matchData,
                                // sessionId: client.client.sessionId,
                                userIndex: userIndex,
                                oppName: opponentInfo.userName,
                                oppAvatar: opponentInfo.avatar,
                                playerCount: this.numClientsToMatch,
                                // oppdbId: opponentInfo.dbId,
                                oppSessionId: this.state.players[client.client.id],
                                type: "SEAT"
                            });
                        } else {
                            console.log("Wrong ROOM");
                        }
                            // client.client.send(room.roomId);
                            console.log("after ROOMCONNECT");

                        }));

                    } else {
                        console.log("here in the else checkGroupsReady");
                    }
                })
        );

    }

    onLeave(client) {
        try{
            console.log("client left", client.sessionId);

            let index = -1;
            index = this.stats.findIndex(stat => stat.client.sessionId === client.sessionId);
            if (index >= 0) {
                console.log("Index: " + index)
                this.stats.splice(index, 1);
            } else {
                console.log("Index1: " + index);
            }
    
            this.matchingGroups.filter(obj => {
                if (obj.clients[0].client.sessionId === client.sessionId) {
                    console.log("Group Info: " + obj.averagePoints);
                    obj.active = false;
                    return obj;
                }else{
                    console.log("Group Info1: " + obj.averagePoints);
                }
            });
            this.playerCount--;
        }catch(err){
            console.log("error in two player lobby -> ", err);
        }
      
        
    }
    
    //   setEvents( client: Client, data: any ) {
    
    //       let command: string = data['command'];
    //       console.log("Command" + command);
    //       switch (command) {
    //           case "cancel_request":

    //             let index = -1;
    //             index = this.stats.findIndex(stat => stat.client === client.sessionId);
    //             if (index >= 0) {
    //                 console.log("Index: " + index)
    //                 this.stats.splice(index, 1);
    //             }

    //             this.matchingGroups.filter(obj => {
    //                 if ( obj.clients[0].client.sessionId === client.sessionId ) {

    //                     obj.active = false;
    //                     return obj;
    //                 }
    //             });

    //             break;
    //       }
    //   }

    onDispose() {
        if(this.recreateGroup)
            clearInterval(this.recreateGroup)

        console.log("lobby destroyed!");
    }

    reset() {

        let state = new State();

        state.phase = 'waiting';

        this.setState(state);

    }

}