import { Room, matchMaker, Client } from "colyseus";
// import { NodeStringDecoder } from "string_decoder";

interface rooms {
  roomID: string;
  userID: number;
  t_id: string;
  active: boolean;
}
interface Tournament {}

export class tournamentSingletonClass {
  private static _instance: tournamentSingletonClass;
  private rooms = new Map<string, Array<any>>();
  private lobbys = new Map<String, Room>();
  private _score: number = 0;
  private _roomDict = {};
  private _round = new Map<string, number>();
  private _roomsCreatedForTournament = new Map<string, any>();
  private _lobbyTimers = new Map<string, boolean>();
  // private gameRoomsCreated = [];
  // private stats: ClientStat[] = [];
  private constructor() {
    if (tournamentSingletonClass._instance) {
      throw new Error(
        "Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new."
      );
    }
    tournamentSingletonClass._instance = this;
  }

  public static getInstance(): tournamentSingletonClass {
    if (
      tournamentSingletonClass._instance == null ||
      tournamentSingletonClass._instance == undefined
    ) {
      tournamentSingletonClass._instance = new tournamentSingletonClass();
    }
    return tournamentSingletonClass._instance;
  }

  //add rooms to our room map
  public addGameRoomData(key: string, value: Array<any>): void {
    this.rooms.set(key, value);
  }
  //add lobby rooms to our lobby room map
  public addLobbyRoomData(key: string, value: any): void {
    this.lobbys.set(key + "_", value);
    console.log("Lobby room saved successfully key-> ", key);
  }
  public checkIfRoomCreated(key: string): boolean {
    for (const [keyOfRooms, value] of this._roomsCreatedForTournament) {
      if (keyOfRooms.startsWith(key)) {
        console.log("this room already created");
        return false;
      }
    }
    console.log("room need to be created");
    return true;
  }

  public arrangeRoom(value: any, t_id: string, tournamentStartTime: any): void {
    var round = this.getRound(t_id);
    if (value.length == 1) {
      console.log("tournaMent Ended.", value);
      for (const [key, room] of this.lobbys) {
        if (key.startsWith(t_id)) {
          room.broadcast("tournamentEnded", { winnerId: value[0], rank1: value[0].userName, rank1Avatar: value[0].userAvatar });
        }
      }
    } else {
      console.log("this round => ", round);
      if (round == null) {
        this.setRound(t_id, 1);
        round = 1;
      } else {
        this.setRound(t_id, round + 1);
        round = round + 1;
      }

      var roomNameString = t_id + "_" + round;
      console.log("value -> ", value);
      var playerPerRoom = 4;
      var minPlayerPerRoom = 2;
      var totalRooms = Math.floor(value.length / playerPerRoom);
      var extraPlayer = value.length % playerPerRoom;
      var rooms: Array<number> = [];
      console.log("value.length -> ", value.length);
      console.log("totalRooms -> ", totalRooms);
      console.log("extraPlayer -> ", extraPlayer);
      if (extraPlayer < minPlayerPerRoom && totalRooms > 0 && extraPlayer > 0) {
        totalRooms--;
        extraPlayer = extraPlayer + playerPerRoom;
        if (extraPlayer % 2 == 1) {
          extraPlayer = Math.floor(extraPlayer / 2);
          rooms.push(extraPlayer + 1);
          rooms.push(extraPlayer);
        } else {
          extraPlayer = Math.floor(extraPlayer / 2);
          rooms.push(extraPlayer);
          rooms.push(extraPlayer);
        }
        console.log("rooms Count 0 -> ", rooms);
        extraPlayer = 0;
      }
      if (extraPlayer > 0) {
        rooms.push(extraPlayer);
        console.log("rooms Count 1 -> ", rooms);
      }
      for (var i = 0; i < totalRooms; ++i) {
        rooms.push(playerPerRoom);
        console.log("rooms Count 2 -> ", rooms);
      }
      // var tournamentRound = new tournamentRound();
      // var tr = tournamentRound.addTournamentRound(key,rooms);
      var countRoom = 0;
      var countPlayer = 0;
      var roomsCreated: Array<rooms> = [];
      console.log("rooms Count -> 3 ", rooms);
      // create rooms for every playser registered on first player join to lobby
      for (var j of rooms) {
        // var roomName: String = key+"_"+tr.getID()+"_"+countRoom;
        var room = roomNameString + "_" + countRoom + "_";
        for (var k = 0; k < j; ++k) {
          //get and set user Id

          roomsCreated.push({
            roomID: room,
            userID: value[countPlayer],
            t_id: t_id,
            active: false,
          });
          countPlayer++;
        }
        countRoom = countRoom + 1;
        matchMaker.createRoom("tournamentGameRoom", {
          roomId: room,
          playerCount: j,
          tournamentStartTime: tournamentStartTime,
          t_id: t_id,
        });
      }
      this.timerForGameStartLobby(t_id, round, countRoom);
      this._roomsCreatedForTournament.set(roomNameString + "_", roomsCreated);
      if (round > 1) {
        for (const [key, value] of this.lobbys) {
          if (key.startsWith(t_id)) {
            value.broadcast("newRoundStart", {
              rooms: roomsCreated,
            });
          }
        }
      }
    }
  }
  public timerForGameStartLobby(
    t_id: string,
    round: number,
    roomcount: number
  ) {
    var winnerArray = [];
    console.log("starting Timer to keep an eye -> ");
    var roomCount = roomcount;
    var tournamentTimer = setInterval(() => {
      
      var t_Id = t_id;
      var tournamentrooms = this.getRoomByTournmnetandRoundId(t_id, round);
      console.log("winnerArray -> ", winnerArray);
      console.log("roomCount -> ", roomCount);
      for (const [key, value] of tournamentrooms) {
        if (key.startsWith(t_id + "_" + round + "_")) {
          // console.log(value);
          // var allGottisOfeveryOngoingGame = value[0].returnAllGottis();
          //console.log("allGottisOfeveryOngoingGame -> ", allGottisOfeveryOngoingGame);
          var roomClosed = value[1];
          console.log("roomClosed -> ", roomClosed);
          if (roomClosed) {
            if (value[2].userId != 0 || value[2].userId != null) {
              let winner = this.rooms.get(key)[2];
              if (!(winnerArray.includes(winner))) {
                console.log("new Winner -> ", winner);
                roomCount--;
                for (const [key, value] of this.lobbys) {
                  if (key.startsWith(t_id)) {
                    console.log("waiting for next round.");
                    value.broadcast("waitForNewRoundToStart", {
                      winner: winner,
                      winnersLeft: roomCount,
                      // allPlayerGottis: allGottisOfeveryOngoingGame,
                    });
                  }
                }
                winnerArray.push(winner);
              }
            }
          }
        }
      }
      
      console.log("roomCount 1-> ", roomCount);
      console.log("winnerArray -> ", winnerArray);
      if (roomCount == 0) {
        clearInterval(tournamentTimer);
        this.arrangeRoom(winnerArray, t_Id, null);
      }
    }, 1000);
  }
  public setRound(key: string, value: number): void {
    this._round.set(key + "_", value);
  }
  public getRound(t_id: string): number {
    let round: number;
    for (const [key, value] of this._round) {
      console.log("getRound -> ", key + " = " + value);
      if (key.startsWith(t_id + "_")) {
        round = value;
      }
    }
    return round;
    //return this._round;
  }

  public getRoomDataFirstRound(userId: string, roomKey: string): any {
    var roomId: string;
    let playerCount: number = 0;
    for (const [key, value] of this._roomsCreatedForTournament) {
      console.log(key + " = " + JSON.stringify(value));
      if (key.startsWith(roomKey + "_")) {
        for (let i = 0; i < value.length; i++) {
          console.log(value[i].userID + " = " + userId);
          if (value[i].userID == userId) {
            roomId = value[i].roomID;
          }
        }
      }
    }
    for (const [key, value] of this._roomsCreatedForTournament) {
      console.log(key + " = " + value);
      if (key.startsWith(roomKey + "_")) {
        for (let i = 0; i < value.length; i++) {
          console.log(value[i].roomID + " = " + roomId);
          if (value[i].roomID == roomId) {
            playerCount++;
          }
        }
      }
    }
    let info = {
      roomId: roomId,
      playerCount: playerCount,
    };
    console.log(" room ID & playerCountin room -> ", info);
    return info;
  }
  public getPlayersByTournment(key: string): Map<string, Room> {
    let roomsToReturn = new Map<string, Room>();
    console.log("key -> ", key);
    for (const [key, value] of this.rooms) {
      console.log(key + " = " + value);
      if (key.startsWith(key + "_")) {
        console.log("room match found");
        roomsToReturn.set(key, value[0]);
      }
    }
    return roomsToReturn;
  } //it will match ti_id and retne all roms for that tonramnet

  public getRoomByTournmnetandRoundId(
    t_id: string,
    round_id: number
  ): Map<string, Array<any>> {
    let roomsToReturn = new Map<string, Array<any>>();
    for (const [key, value] of this.rooms) {
      //console.log(key + " = " + value);
      if (key.startsWith(t_id + "_" + round_id + "_")) {
        roomsToReturn.set(key, value);
      }
    }
    return roomsToReturn;
  }
  public sendMesageToTournamnetAndround(
    tournmanet_id: string,
    round_id: string
  ): void {
    // getRoomsByT and R
    // and braodcat
    //let roomsToReturn = new Map<string,Room>();
    for (const [key, value] of this.rooms) {
      console.log(key + " = " + value);
      if (key.startsWith(tournmanet_id + "_" + round_id + "_")) {
        this.rooms.get(key)[0].broadcast("Brodcasting", { value: "hey" });
      }
    }
  }
  public getUsersInTandR(t_id: string, r_id: string): Client[] {
    let users: Client[];
    for (const [key, value] of this.rooms) {
      console.log(key + " = " + value);
      if (key.startsWith(t_id + "_" + r_id + "_")) {
        for (let clients of this.rooms.get(key)[0].clients) {
          users.push(clients);
        }
      }
    }
    return users;
  }
  // public arrangeRooms(t_id: string){

  // }
  public broadcast(message: string, value: any, key: string): void {
    console.log("broadcast Value: ", value);
    this._roomDict[key].broadcast(message, value);
  }
  // public TournamentRoundArrangeRooms(tourny: Tournament){
  //     var trl = this.getLevel(tourny);
  //     var fb = this.getFB(trl);
  //     var sb= fb*2;
  //     var playerPerRoom=4;
  //     var minPlayerPerRoom=2;
  // }
  public getFB(trl): number {
    return 0;
  }
  public getLevel(tourny: Tournament) {}

  public saveUser(client: Client, options: any): void {
    // this.stats.push({
    //     client: client,
    //     coin: parseInt(options.coin),
    //     waitingTime: 0,
    //     userID: parseInt(options.userID),
    //     userName: options.userName,
    //     avatar: JSON.stringify(options.avatar),
    //     options,
    //   });
  }
  // public getStats(): ClientStat[]{
  //     return this.stats;
  // }
  public getRoom(): any {
    let key: any;
    for (let i in this._roomDict) {
      key = this._roomDict[i];
    }
    //  console.log("another room ID",key);
    return key;
  }

  public setScore(value: number): void {
    this._score = value;
  }

  public getScore(): number {
    return this._score;
  }

  public addPoints(value: number): void {
    this._score += value;
  }

  public removePoints(value: number): void {
    this._score -= value;
  }
}
// export interface Tournament{
//     broadcast(message: string, value: any, key: string): void;
//     getRoom():any;
//     addroomData(key: string, value: any):void;
// }
// let rooms = new Map<string, Room>();
// let lobbys=new Map<String, Room>();
// tid_roundid_romname,roomobject
// tid_lobby, roomobject

// addRoom(name,roomobjcet)
// {
// }
// addLobby(name, roomobject();

// getRoomByTournment(t_id): Map<String,Room>();//it will match ti_id and retne all roms for that tonramnet
// getRoomByTournmnetandRoundId(string t_id, string round_id):Map<String,Room>

// sendMesageToTournamnetAndround(string tournmanet_id, String round_id){
//     getRoomsByT and R
//     and braodcat

//     }
//     getUsersInTandR(t_idm r_id){

//     }
//     getTimeLeftInEachRoom

// public TournamentRound arrangeRooms(Tournament tourny){
//     TournamentRoundLevel	trl=getLevel(tourny);
//     int fb=getFB(trl);
//     int sb=fb*2;
//     int playerPerRoom=6;
//     int minPlayerPerRoom=4;
//      decide the player per room
//     if(tourny.getGameType()==GameType.RummyTournament){
//         playerPerRoom=4;
//         minPlayerPerRoom=2;
//         fb=getFBRummy(trl);
//         sb=100*fb;
//     }else if(tourny.getGameType()==GameType.TeenpattiTournament){
//         playerPerRoom=7;
//         minPlayerPerRoom=4;
//     }
//     List<TournamentPlayer> players=tournamentPlayerDAO.getByTournament(tourny,sb); // list of players

//     int totalRooms=players.size()/playerPerRoom;
//     int extraPlayer=players.size()%playerPerRoom;
//     List<Integer> rooms=new ArrayList<Integer>();
//     if(extraPlayer<minPlayerPerRoom&&totalRooms>0&&extraPlayer>0){
//         totalRooms--;
//         extraPlayer=extraPlayer+playerPerRoom;
//         if(extraPlayer%2==1){
//           extraPlayer=extraPlayer/2;
//           rooms.add(extraPlayer+1);
//           rooms.add(extraPlayer);
//         }else{
//             extraPlayer=extraPlayer/2;
//             rooms.add(extraPlayer);
//             rooms.add(extraPlayer);
//         }
//         extraPlayer=0;
//     }
//     if(extraPlayer>0){
//         rooms.add(extraPlayer);
//     }
//     for(int i=0;i<totalRooms;++i){
//         rooms.add(playerPerRoom);
//     }

//    TournamentRound tr= addTournamentRound(tourny,rooms,trl);
//    String orderBy="ID";
//    int indexOrder=tr.getTournamentRoundLevel().ordinal()%4;
//    if(indexOrder==1){
//        orderBy="startFee";
//    }
//    if(indexOrder==2){
//        orderBy="user";

//    }
//    if(indexOrder==3){
//        orderBy="registrationTime";
//    }
//    players=tournamentPlayerDAO.getByTournament(tourny,sb,orderBy);
//     int countRoom=0;
//     int countPlayer=0;
//     for(int j:rooms){
//         String roomName=tourny.getTournamentName()+"_"+tourny.getID()+"_"+tr.getID()+"_"+countRoom;
//         Room room=addTournamentRoom(tourny,roomName,2,tr);
//         for(int k=0;k<j;++k){
//             TournamentPlayerRound p=new TournamentPlayerRound();
//             p.setCreatedAt(new Timestamp(new java.util.Date().getTime()));
//             p.setModifiedAt(new Timestamp(new java.util.Date().getTime()));
//             p.setUserId((int)players.get(countPlayer).getUser().getUserId());
//             p.setTournamentId(tourny.getID());
//             p.setRoomName(roomName);
//             p.setRoomId(room.getID());
//             p.setRoundId(tr.getID());
//             tournamentPlayerRoundDAO.save(p);
//             countPlayer++;
//         }
//         countRoom=countRoom+1;
//     }
//     Tournament tr1=tournamentDAO.get(tourny.getID());
//     tr1.setLastProcessedRound(Integer.toString(tr.getID()));
//     tournamentDAO.merge(tr1);
//     return tr;
//   }
// @Transactional
// public TournamentRound addTournamentRound(Tournament tourny,List<Integer> rooms,TournamentRoundLevel trl)
// {
//       if(trl==null){
//           trl=getLevel(tourny);
//       }
//       TournamentRound tr=new TournamentRound();
//       tr.setScheduledTime(new Timestamp(new java.util.Date().getTime()));
//       tr.setTournament(tourny);
//       tr.setMaxTables(rooms.size());
//       tr.setNumberOfTables(rooms.size());
//       tr.setTournamentRoundLevel(trl);
//       tr.setRoundOrder(1);
//       tournamentRoundDAO.save(tr);
//       return tr;
// }

// mysql> desc tournament;
// +-------------------------+---------------+------+-----+-------------+----------------+
// | Field                   | Type          | Null | Key | Default     | Extra          |
// +-------------------------+---------------+------+-----+-------------+----------------+
// | id                      | int(11)       | NO   | PRI | NULL        | auto_increment |
// | tournament_name         | varchar(100)  | YES  |     | NULL        |                |
// | max_player_per_table    | int(11)       | YES  |     | NULL        |                |
// | scheduled_time          | datetime      | NO   |     | NULL        |                |
// | max_number_of_tables    | int(11)       | YES  |     | NULL        |                |
// | entry_fee               | decimal(50,0) | YES  |     | NULL        |                |
// | registration_close_time | datetime      | YES  |     | NULL        |                |
// | registration_open_time  | datetime      | YES  |     | NULL        |                |
// | tournament_type         | varchar(45)   | YES  |     | NULL        |                |
// | process_status          | varchar(40)   | YES  |     | unprocessed |                |
// | last_processed_round    | varchar(50)   | YES  |     | NULL        |                |
// | prize                   | int(11)       | YES  |     | 0           |                |
// | enabled                 | tinyint(1)    | YES  |     | 1           |                |
// | third_prize             | int(11)       | YES  |     | 0           |                |
// | fourth_prize            | int(11)       | YES  |     | 0           |                |
// | fifth_prize             | int(11)       | YES  |     | 0           |                |
// | second_prize            | int(11)       | YES  |     | 0           |                |
// | background_image        | varchar(300)  | YES  |     | NULL        |                |
// | icon_image              | varchar(300)  | YES  |     | NULL        |                |
// | win_image               | varchar(300)  | YES  |     | NULL        |                |
// | isExternal              | tinyint(1)    | YES  |     | 0           |                |
// | completed               | tinyint(1)    | YES  |     | 0           |                |
// | re_buy                  | int(11)       | YES  |     | NULL        |                |
// | tournamentcointype      | tinyint(2)    | YES  |     | 1           |                |
// | tournamentwintype       | tinyint(2)    | YES  |     | 1           |                |
// +-------------------------+---------------+------+-----+-------------+----------------+
// 25 rows in set (0.00 sec)

// mysql> desc tournament_player;
// +-------------------+---------------+------+-----+---------+----------------+
// | Field             | Type          | Null | Key | Default | Extra          |
// +-------------------+---------------+------+-----+---------+----------------+
// | id                | int(11)       | NO   | PRI | NULL    | auto_increment |
// | tournament_id     | int(11)       | YES  | MUL | NULL    |                |
// | player_id         | bigint(20)    | YES  | MUL | NULL    |                |
// | scheduled_time    | datetime      | YES  |     | NULL    |                |
// | registration_time | datetime      | YES  |     | NULL    |                |
// | start_fee         | decimal(10,0) | YES  |     | NULL    |                |
// | fold_count        | int(11)       | YES  |     | 0       |                |
// | feesReturned      | tinyint(1)    | YES  |     | 0       |                |
// | return_date       | datetime      | YES  |     | NULL    |                |
// | last_updated      | datetime      | YES  |     | NULL    |                |
// +-------------------+---------------+------+-----+---------+----------------+

// mysql> desc tournament_round
//     -> ;
// +----------------------+--------------+------+-----+---------+----------------+
// | Field                | Type         | Null | Key | Default | Extra          |
// +----------------------+--------------+------+-----+---------+----------------+
// | id                   | int(11)      | NO   | PRI | NULL    | auto_increment |
// | scheduled_time       | datetime     | YES  |     | NULL    |                |
// | tournament_id        | int(11)      | YES  | MUL | NULL    |                |
// | number_of_tables     | int(11)      | YES  |     | NULL    |                |
// | max_number_of_tables | int(11)      | YES  |     | NULL    |                |
// | round_level          | varchar(100) | YES  |     | NULL    |                |
// | round_order          | int(11)      | YES  |     | NULL    |

// mysql> desc tournament_player_round;
// +---------------+--------------+------+-----+---------+----------------+
// | Field         | Type         | Null | Key | Default | Extra          |
// +---------------+--------------+------+-----+---------+----------------+
// | id            | int(11)      | NO   | PRI | NULL    | auto_increment |
// | tournament_id | int(11)      | YES  | MUL | NULL    |                |
// | user_id       | bigint(20)   | YES  | MUL | NULL    |                |
// | room_id       | bigint(20)   | YES  |     | NULL    |                |
// | room_name     | varchar(255) | YES  |     | NULL    |                |
// | round_id      | int(11)      | YES  |     | NULL    |                |
// | created_at    | datetime     | YES  |     | NULL    |                |
// | modified_at   | datetime     | YES  |     | NULL    |                |
// +---------------+--------------+------+-----+---------+----------------+
// 8 rows in set (0.00 sec)
