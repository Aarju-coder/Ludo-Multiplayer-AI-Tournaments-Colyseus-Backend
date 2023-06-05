import * as UTILS from "./utils";
interface turnCountArray {
  color: string;
  count: number;
}
const CONSTANTS = {
  startRed: 18,
  startGreen: 1,
  startBlue: 35,
  startYellow: 52,
  redStop: 14,
  greenStop: 65,
  yellowStop: 48,
  blueStop: 31,
  greenEntry: 110,
  yellowEntry: 120,
  blueEntry: 130,
  redEntry: 100,
  greenEnd: 117,
  yellowEnd: 127,
  blueEnd: 137,
  redEnd: 107,
  starPositions: [1, 10, 18, 27, 35, 44, 52, 61, 14, 65, 48, 31],
  //starPositions: [1, 10, 18, 27, 35, 44, 52, 61],
  defaultColors: ["red", "green", "yellow", "blue"],
  timer: "",
};
export class AIGame {
  playerIndex: number;
  availablePowerUps: any[];
  movementAmount: number;
  gameEnded: number;
  currentPlayerColor: string;
  sixCount: number;
  isPowerUpActive: number;
  isPowerUpRunning: number;
  players: any;
  totalPlayersCount: any;
  winners: any[];
  powerUps: any[][];
  allGottis: {};
  allGottisAfterReconnection: {};
  movableGottis: any[];
  hasMoved: number;
  noPlayerChange: number;
  oppPositions: {};
  powerUpsLocation: {};
  gottisInside: string[][];
  gottisOutside: any[][];
  ghotihome: number[];
  clickAble: number;
  timeOut: any;
  sixArray: any = [];
  indexForSix: number;
  room: any;
  playerTurnCount: turnCountArray[];
  constructor(players, room) {
    this.playerIndex = 4;
    // this.availablePowerUps = ['freeRoll', 'skipTurn', 'killAnyGotti'];
    console.log("inside game");
    this.availablePowerUps = [];
    this.movementAmount = 0;
    this.gameEnded = 0;
    this.sixCount = 0;
    this.currentPlayerColor = "";
    this.isPowerUpActive = 0;
    this.isPowerUpRunning = 0;
    this.players = players;
    this.totalPlayersCount = players.length;
    this.winners = [];
    this.powerUps = [[], [], [], []];

    //contains all the gottis as key and the positions as values red1=32
    this.allGottis = {};
    this.allGottisAfterReconnection = {};
    this.movableGottis = [];
    //indicates if a player has played his turn or not
    this.hasMoved = 1;
    this.noPlayerChange = 0;
    //holds opponent positions
    this.oppPositions = {};
    //indicates which location holds which powerups 1:freeRoll
    this.powerUpsLocation = {};
    this.gottisInside = [
      ["red1", "red2", "red3", "red4"],
      ["green1", "green2", "green3", "green4"],
      ["yellow1", "yellow2", "yellow3", "yellow4"],
      ["blue1", "blue2", "blue3", "blue4"],
    ];
    (this.gottisOutside = [[], [], [], []]), (this.ghotihome = [0, 0, 0, 0]);
    this.timeOut = null;
    this.sixArray = [];
    this.indexForSix = 0;
    this.room = room;
    this.playerTurnCount = [
      { color: "red", count: 0 },
      { color: "green", count: 0 },
      { color: "yellow", count: 0 },
      { color: "blue", count: 0 },
    ];
  }
  async playerIndicator() {
    // this.broadcast("", {})
    console.log("Player indicator");
    try {
      this.hasMoved = 1;
      this.movableGottis = [];
      if (this.sixCount == 0 && this.noPlayerChange == 0) {
        if (this.noPlayerChange == 0) {
          this.isPowerUpActive = 0;
          // this.players.forEach(player => {
          //     if (player) {
          //console.log("Player inside Plaayer indicator");
          this.room.broadcast("removeShakeAnimation", {
            gottisInside: this.gottisInside,
            gottisOutside: this.gottisOutside,
          });
          //     }
          // });
          if (this.playerIndex == 0) {
            this.playerIndex = 4;
          }
          this.playerIndex = (this.playerIndex - 1) % 4;

          while (
            !this.allGottisAfterReconnection.hasOwnProperty(this.playerIndex)
          ) {
            if (this.playerIndex == 0) {
              this.playerIndex = 4;
            }
            this.playerIndex = (this.playerIndex - 1) % 4;
          }
          if (this.players[this.playerIndex].sock.id == "AI") {
            await new Promise((r) => setTimeout(r, 1000));
          } else {
            await new Promise((r) => setTimeout(r, 300));
          }
          if (this.playerIndex == 0) this.currentPlayerColor = "red";
          else if (this.playerIndex == 1) this.currentPlayerColor = "green";
          else if (this.playerIndex == 2) this.currentPlayerColor = "yellow";
          else if (this.playerIndex == 3) this.currentPlayerColor = "blue";
          //adds highlight around home of current player
          this.movementAmount = 0;
          this.sixArray = [];
          this.indexForSix = 0;
          if (this.timeOut != null) {
            clearTimeout(this.timeOut);
          }
          this.turnTimer(0);

          // this.players.forEach(player => {

          //     if(player) {
          //console.log("sock emit Player Indicator");
          this.room.broadcast("playerIndicator", {
            currentPlayerColor: this.currentPlayerColor,
            id: this.players[this.playerIndex].sock.id,
          });
          if (this.players[this.playerIndex].sock.id == "AI") {
            this.makeRoll();
          }
          //     }
          // });
        }
      }
    } catch (e) {
      //console.log("error in turn change -> ", e);
    }
  }
  turnTimer(samePlayerTurn: number) {
    this.timeOut = setTimeout(() => {
      // this.sixArray = [];
      //console.log("changing player turn -> ", this.playerIndex);
      this.playerTurnCount.forEach((attr, index) => {
        if (index == this.playerIndex) {
          attr.count++;
          console.log("playerTurnCount of -> ", attr);
          if (attr.count == 2) {
            this.players.forEach((value) => {
              console.log("value in player Turn Count: ", value);
              if (
                this.currentPlayerColor == value.playerColor &&
                value.sock.id != "AI"
              ) {
                value.sock.send("MisseTwoTurn");
              } else if (
                this.currentPlayerColor == value.playerColor &&
                value.sock.id == "AI"
              ) {
                console.log("AI missed 3 turns not possible.");
                // value.sock.send("MisseTwoTurn");
              }
            });
            console.log("player will leave due to two turns skipped ");
          } else if (attr.count == 1) {
            console.log("missed one turn1 ");
            this.players.forEach((player) => {
              console.log("missed one turn ", player.playerColor, attr.color);
              if (player.playerColor == attr.color && player.sock.id != "AI") {
                console.log("missed one turn3 ");
                player.sock.send("MissedOneTurn");
              } else if (
                player.playerColor == attr.color &&
                player.sock.id == "AI"
              ) {
                console.log("missed one turn3 AI ");
                // player.sock.send("MissedOneTurn");
              }
            });
          }
          return;
        }
      });

      this.sixCount = 0;
      this.noPlayerChange = 0;
      console.log("player Count in Room -> ", this.room.playerCount);
      if (this.room.playerCount > 0) this.playerIndicator();
    }, 15000);
  }
  async makeRoll() {
    this.hasMoved = 0;
    this.oppPositions = {};
    let myPositions: any[] = [];
    console.log("allGottis inside Game class -> ", this.allGottis);
    for (let key in this.allGottis) {
      if (this.allGottis.hasOwnProperty(key)) {
        for (let key2 in this.allGottis[key]) {
          console.log(
            "allGottis inside Game class 2 -> ",
            this.allGottis[key],
            " ",
            key,
            " ",
            key2
          );
          if (this.allGottis[key].hasOwnProperty(key2)) {
            let val = this.allGottis[key][key2];
            if (val > 0 && val < 100) {
              if (parseInt(key) != this.playerIndex)
                this.oppPositions[val] = key2;
              else myPositions.push(val);
            }
          }
        }
      }
    }
    console.log("--------------------------------------------");
    console.log("gottis inside");
    console.log(this.gottisInside);
    console.log("gottis inside");
    console.log("gottis Outside");
    console.log(this.gottisOutside);
    console.log("gottis Outside");
    //console.log("all gottis");
    //console.log(this.allGottis);
    console.log("all gottis");
    console.log("oppositions");
    console.log(this.oppPositions);
    console.log("oppositions");
    console.log("powerUps positions");
    console.log(this.powerUpsLocation);
    console.log("powerUps positions");
    console.log("--------------------------------------------");
    //as he just rolled he still has to move his gotti
    // await this.players[this.playerIndex].emit("calculateAllGottiPos", this.gottisOutside);
    if (this.gottisOutside[this.playerIndex].length == 0) {
      this.movementAmount = UTILS.biasedRandom(6, 40);
      console.log("movement amount 40: ", this.movementAmount);
      //sees if there is any players ahead and tries to cut it
    } else {
      let biases: any[] = [];
      myPositions.forEach((mine) => {
        for (let key in this.oppPositions)
          if (parseInt(key) - mine <= 6 && parseInt(key) - mine > 0) {
            console.log("there is someone at", parseInt(key) - mine);
            biases.push(parseInt(key) - mine);
          }
      });
      //cuts players with 30% chance
      if (biases.length > 0) {
        this.movementAmount = UTILS.biasedRandom(biases, 30);
        console.log("movement amount 30: ", this.movementAmount);
      } else {
        this.movementAmount = UTILS.biasedRandom(6, 10);
        console.log("movement amount 10: ", this.movementAmount);
      }
    }

    clearTimeout(this.timeOut);
    this.turnTimer(0);

    let CurrentPlayerBeforeRoll = this.currentPlayerColor;

    await this.room.broadcast("rollTheDice", {
      movementAmount: this.movementAmount,
      currentPlayerColor: this.currentPlayerColor,
    });
    await new Promise((r) => setTimeout(r, 2000));
    await this.gameController(CurrentPlayerBeforeRoll);
  }
  checkIfmoveCanbeMade() {
    let myPositions: any[] = [];
    for (let key in this.allGottis) {
      if (this.allGottis.hasOwnProperty(key)) {
        for (let key2 in this.allGottis[key]) {
          if (this.allGottis[key].hasOwnProperty(key2)) {
            let val = this.allGottis[key][key2];
            if (parseInt(key) == this.playerIndex) {
              myPositions.push(val);
              console.log("check : ", parseInt(key), " === ", this.playerIndex);
            }
          }
        }
      }
    }
    let EndPos;
    if (this.currentPlayerColor == "red") {
      EndPos = CONSTANTS.redEnd;
    } else if (this.currentPlayerColor == "green") {
      EndPos = CONSTANTS.greenEnd;
    } else if (this.currentPlayerColor == "yellow") {
      EndPos = CONSTANTS.yellowEnd;
    } else if (this.currentPlayerColor == "blue") {
      EndPos = CONSTANTS.blueEnd;
    }
    console.log(
      "EndPos - ",
      EndPos,
      " myPosition -",
      myPositions,
      " sixArray: ",
      this.sixArray
    );

    let tempArray: number[] = [];
    for (let i = 0; i <= this.sixArray.length; i++) {
      let bool: boolean = true;
      myPositions.forEach((pos: number) => {
        let finalPos = pos + this.sixArray[i];
        console.log(
          "current pos - ",
          pos,
          " + movementAmount",
          this.sixArray[i],
          " final pos -",
          finalPos
        );
        if (finalPos <= EndPos) {
          bool = false;
        }
      });
      console.log("if the pieces can move with this movement amount ", bool);
      if (!bool) {
        tempArray.push(this.sixArray[i]);
        console.log(tempArray, "  tempArray");
      }
    }
    console.log("sixArray - ", this.sixArray);
    this.sixArray = [];
    console.log("sixArray - ", tempArray);
    if (tempArray.length) {
      tempArray.forEach((val) => {
        this.sixArray.push(val);
      });
    }
    console.log("sixArray - ", this.sixArray);
  }
  async gameController(CurrentPlayerBeforeRoll) {
    console.log("inside gameController");
    this.noPlayerChange = 0;
    if (this.currentPlayerColor == CurrentPlayerBeforeRoll) {
      if (this.movementAmount != 6) {
        clearTimeout(this.timeOut);
        this.turnTimer(0);
      } else {
        this.sixCount++;
        clearTimeout(this.timeOut);
        this.turnTimer(1);
      }
    }
    if (this.currentPlayerColor == CurrentPlayerBeforeRoll) {
      if (this.sixCount > 0 && this.sixCount < 3) {
        this.sixArray.push(this.movementAmount);
        console.log("six Array Length ", this.sixArray.length);
        this.hasMoved = 1;
        if (this.movementAmount == 6) {
          // this.players.forEach(player => {
          //     if(player) {
          console.log("sending the currentPlayer");
          if (this.players[this.playerIndex].sock.id == "AI") {
            this.makeRoll();
          } else {
            this.room.broadcast("playerIndicator1", {
              currentPlayerColor: this.currentPlayerColor,
              id: this.players[this.playerIndex].sock.id,
            });
          }

          // }
          // });
        } else {
          this.checkIfmoveCanbeMade();

          if (this.sixArray.length) {
            this.indexForSix = this.sixArray.length;
            this.movePlayerGottis();
          } else {
            console.log("changing turn due to no piece could be moved");
            this.sixCount = 0;
            this.noPlayerChange = 0;
            this.playerIndicator();
          }
        }
      } else if (this.sixCount == 0) {
        let myPositions: any[] = [];
        for (let key in this.allGottis) {
          if (this.allGottis.hasOwnProperty(key)) {
            for (let key2 in this.allGottis[key]) {
              if (this.allGottis[key].hasOwnProperty(key2)) {
                let val = this.allGottis[key][key2];
                if (parseInt(key) == this.playerIndex) {
                  myPositions.push(val);
                  console.log(
                    "check : ",
                    parseInt(key),
                    " === ",
                    this.playerIndex
                  );
                }
              }
            }
          }
        }
        let EndPos;
        if (this.currentPlayerColor == "red") {
          EndPos = CONSTANTS.redEnd;
        } else if (this.currentPlayerColor == "green") {
          EndPos = CONSTANTS.greenEnd;
        } else if (this.currentPlayerColor == "yellow") {
          EndPos = CONSTANTS.yellowEnd;
        } else if (this.currentPlayerColor == "blue") {
          EndPos = CONSTANTS.blueEnd;
        }
        console.log(
          "When not 6 EndPos - ",
          EndPos,
          " myPosition -",
          myPositions
        );
        let bool = true;
        myPositions.forEach((pos: number, index) => {
          let finalPos = pos + this.movementAmount;
          console.log(
            "current pos - ",
            pos,
            " + movementAmount",
            this.movementAmount,
            " final pos -",
            finalPos
          );
          if (finalPos <= EndPos) {
            bool = false;
          }
        });
        if (bool) {
          this.playerIndicator();
        } else {
          this.hasMoved = 0;
          //j aayepani shake animation halney code same nai hunxa
          await this.findMovableGottis();
          //waiting for the calculations to be sent from the client to the server
          if (this.movableGottis.length == 0) this.playerIndicator();
          else if (this.movableGottis.length == 1) {
            await this.moveGotti(this.movableGottis[0]);
          } else {
            let movableGottisPositions: any[] = [];
            this.movableGottis.forEach((id) => {
              movableGottisPositions.push(this.allGottis[this.playerIndex][id]);
            });
            if (this.gottisOutside[this.playerIndex].length == 0)
              await this.moveGotti(this.movableGottis[0]);
            //checks if all the available gottis are in the same position
            else if (
              movableGottisPositions.every((val, i, arr) => val === arr[0])
            ) {
              this.moveGotti(this.movableGottis[0]);
            }
          }
        }
      } else {
        this.sixCount = 0;
        this.playerIndicator();
      }
    }
  }
  async movePlayerGottis() {
    if (
      (this.indexForSix == 2 &&
        (this.gottisInside[this.playerIndex].length == 4 ||
          (this.gottisInside[this.playerIndex].length == 3 &&
            (this.gottisOutside[this.playerIndex][0] == CONSTANTS.startBlue ||
              this.gottisOutside[this.playerIndex][0] == CONSTANTS.startGreen ||
              this.gottisOutside[this.playerIndex][0] == CONSTANTS.startRed ||
              this.gottisOutside[this.playerIndex][0] ==
                CONSTANTS.startYellow)))) ||
      (this.indexForSix == 3 &&
        this.gottisInside[this.playerIndex].length == 4) ||
      this.sixArray.length == 1 ||
      this.allGottis[this.playerIndex].length == 1
    ) {
      this.movementAmount = this.sixArray[0];

      console.log(
        "movePlayerGottis movement amount to be moved ",
        this.sixArray
      );
      this.movableGottis = [];
      this.hasMoved = 0;
      if (this.sixArray.length >= 0) {
        this.sixArray.splice(0, 1);
      }
      await this.findMovableGottis();
      console.log(
        "length of movableGottis movePlayerGottis ",
        this.movableGottis.length
      );
      if (this.movableGottis.length == 0) {
        if (this.movementAmount == 6) {
          this.movePlayerGottis();
        } else {
          console.log("movePlayerGottis when not 6 turn change");
          this.sixCount = 0;
          this.playerIndicator();
        }
      } else if (this.movableGottis.length == 1) {
        // console.log(
        //   "moving if only one piece could be moved ",
        //   this.movableGottis[0]
        // );

        await this.moveGotti(this.movableGottis[0]);
      } else {
        let movableGottisPositions: any[] = [];
        this.movableGottis.forEach((id) => {
          movableGottisPositions.push(this.allGottis[this.playerIndex][id]);
        });
        if (this.gottisOutside[this.playerIndex].length == 0) {
          // console.log(
          //   "moveGotti when this.gottisOutside[this.playerIndex].length == 0"
          // );
          await this.moveGotti(this.movableGottis[0]);
        }
        //checks if all the available gottis are in the same position
        else if (
          movableGottisPositions.every((val, i, arr) => val === arr[0])
        ) {
          // console.log(
          //   "moveGotti when movableGottisPositions.every((val, i, arr) => val === arr[0])"
          // );
          await this.moveGotti(this.movableGottis[0]);
        }
      }
    } else {
      // if(this.indexForSix == 3 &&
      //   (this.gottisInside[this.playerIndex].length == 3 &&
      //     (this.gottisOutside[this.playerIndex][0] == CONSTANTS.startBlue ||
      //       this.gottisOutside[this.playerIndex][0] == CONSTANTS.startGreen ||
      //       this.gottisOutside[this.playerIndex][0] == CONSTANTS.startRed ||
      //       this.gottisOutside[this.playerIndex][0] == CONSTANTS.startYellow
      //       ))){

      // }
      this.hasMoved = 0;
      let GottisPositions: any[] = [];
      let GottiMovementAmounts = {};

      this.gottisOutside[this.playerIndex].forEach((id) => {
        GottisPositions.push(this.allGottis[this.playerIndex][id]);
        GottiMovementAmounts[id] = {};
        this.sixArray.forEach((movement, index) => {
          // greenEntry: 110,
          // yellowEntry: 120,
          // blueEntry: 130,
          // redEntry: 100,
          if (id.includes("red")) {
            if (
              parseInt(this.allGottis[this.playerIndex][id]) + movement <=
              107
            ) {
              GottiMovementAmounts[id][index] = movement;
            }
          } else if (id.includes("green")) {
            if (
              parseInt(this.allGottis[this.playerIndex][id]) + movement <=
              117
            ) {
              GottiMovementAmounts[id][index] = movement;
            }
          } else if (id.includes("blue")) {
            if (
              parseInt(this.allGottis[this.playerIndex][id]) + movement <=
              137
            ) {
              GottiMovementAmounts[id][index] = movement;
            }
          } else if (id.includes("yellow")) {
            if (
              parseInt(this.allGottis[this.playerIndex][id]) + movement <=
              127
            ) {
              GottiMovementAmounts[id][index] = movement;
            }
          }
        });
      });
      console.log("GottiMovement -> ", GottiMovementAmounts);
      console.log("all Gotti positions");
      if (this.players[this.playerIndex].sock.id == "AI") {
        console.log("AI move movePlayerGottis");
        this.AIDecisionMaking();
        console.log("AI move movePlayerGottis*");
      } else {
        this.players[this.playerIndex].sock.send("sixArray", {
          sixArray: this.sixArray,
          GottiMovementAmounts: GottiMovementAmounts,
          gottisInside: this.gottisInside[this.playerIndex],
          gottisOutside: this.gottisOutside[this.playerIndex],
          allGottis: this.allGottis[this.playerIndex],
        });
      }
    }
  }
  AIDecisionMaking() {
    // if (this.sixArray.length) {
    //   this.movementAmount = this.sixArray[0];
    //   this.sixArray.splice(0, 1);
    // }
    if (this.canAIKill()) {
      console.log("AI killed a piece!");
    } else if (this.AIUnlockPiece()) {
      console.log("AI unlocked it's piece");
    } else if (this.AIMoveHome()) {
      console.log("AI moved it's  which was closest to home");
    } else {
      console.log("AI can not move turn changing turn");
      this.sixCount = 0;
      this.playerIndicator();
    }
  }
  AIMoveHome(): boolean {
    if(this.sixArray.length>0)
    this.movementAmount = this.sixArray[0];
    console.log("movement amt. in AI Home ", this.movementAmount);
    let eachPiecePosition = [];
    let eachPieceFinalPos = [];
    let eachPieceResult = [];
    let eachPieceId = [];
    for (let j = 0; j < this.gottisOutside[this.playerIndex].length; j++) {
      eachPieceId[j] = this.gottisOutside[this.playerIndex][j];
      let positions = [];
      let currPos =
        this.allGottis[this.playerIndex][
          this.gottisOutside[this.playerIndex][j]
        ];
      let finalPos = currPos + this.movementAmount;
      let result = {
        killed: "",
        gottiHome: "",
      };
      for (let i = currPos; i <= finalPos; i++) {
        if (i == 69) {
          i = 1;
          finalPos = finalPos % 68;
        }
        positions.push(i);
        if(i == finalPos) {
          if (i == 107) {
            result["gottiHome"] = this.gottisOutside[this.playerIndex][j];
          }
        }
        
        if (this.currentPlayerColor == "red" && i == CONSTANTS.redStop) {
          finalPos = CONSTANTS.redEntry + finalPos - i - 1;
          i = CONSTANTS.redEntry - 1;
        } else if (
          this.currentPlayerColor == "green" &&
          i == CONSTANTS.greenStop
        ) {
          finalPos = CONSTANTS.greenEntry + finalPos - i - 1;
          i = CONSTANTS.greenEntry - 1;
        } else if (
          this.currentPlayerColor == "blue" &&
          i == CONSTANTS.blueStop
        ) {
          finalPos = CONSTANTS.blueEntry + finalPos - i - 1;
          i = CONSTANTS.blueEntry - 1;
        } else if (
          this.currentPlayerColor == "yellow" &&
          i == CONSTANTS.yellowStop
        ) {
          finalPos = CONSTANTS.yellowEntry + finalPos - i - 1;
          i = CONSTANTS.yellowEntry - 1;
        }
      }
      console.log("moving throught positions AIMoveHome-----------");
      console.log(positions);
      eachPiecePosition[j] = positions;
      console.log("Final Position AIMoveHome -> ", finalPos);
      eachPieceFinalPos[j] = eachPiecePosition[j][eachPiecePosition[j].length - 1];
      console.log("Result of each Piece AIMoveHome ", result);

      console.log("moving throught positions AIMoveHome-----------");

      if (!CONSTANTS.starPositions.includes(finalPos)) {
        console.log("Game.oppPositions AIMoveHome -> ", this.oppPositions);
        if (this.oppPositions.hasOwnProperty(finalPos)) {
          let killed = this.oppPositions[finalPos];
          console.log("someone is going to be been murdered AIMoveHome");
          console.log(killed);
          console.log("someone is going to be been murdered AIMoveHome");
          let r = {
            killed: killed,
          };
          result["killed"] = r["killed"];
        }
        eachPieceResult[j] = result;
      }
    }
    console.log(
      "Arrays in AImove home",
      "\n",
      eachPiecePosition,
      "\n",
      eachPieceFinalPos,
      "\n",
      eachPieceResult,
      "\n",
      eachPieceId
    );
    let idToMove = "";
    eachPieceResult.forEach((result, index) => {
      if (result.gottiHome != "") {
        idToMove = eachPieceId[index];
        return;
      }
    });
    console.log("Gotti id to move1 ", idToMove);
    if (idToMove != "") {
      if(this.sixArray.length>0){
        this.sixArray.forEach((movementAmount, index) => {
          if (movementAmount == this.movementAmount) {
            this.movementAmount = movementAmount;
            this.sixArray.splice(index, 1);
            //console.log("remove the number from array ", this.movementAmount);
          }
        });
      }
      this.moveGotti(idToMove);
      return true;
    }
    eachPieceFinalPos.forEach((finalpos, index) => {
      if (finalpos >= 1 && finalpos <= 14) {
        idToMove = eachPieceId[index];
        return;
      }
    });
    console.log("Gotti id to move2 ", idToMove);
    if (idToMove != "") {
      if(this.sixArray.length>0){
        this.sixArray.forEach((movementAmount, index) => {
          if (movementAmount == this.movementAmount) {
            this.movementAmount = movementAmount;
            this.sixArray.splice(index, 1);
            //console.log("remove the number from array ", this.movementAmount);
          }
        });
      }
      this.moveGotti(idToMove);
      return true;
    }

    let temp = 999;
    eachPieceFinalPos.forEach((finalpos, index) => {
      if (finalpos<=68 && finalpos>=18 ) {
        let dist = 68 - finalpos;
        console.log("distance to home ", dist, " temp value -> ", temp);
        
        if (dist>0 &&dist < temp) {
          temp = dist;
          idToMove = eachPieceId[index];
        }
      }else if (finalpos<= 107 && finalpos>=100 ) {
        let dist = 107 - finalpos;
        console.log("distance to home ", dist, " temp value -> ", temp);
        if (dist>0 &&dist < temp) {
          temp = dist;
          idToMove = eachPieceId[index];
        }
      }
    });
    console.log("Gotti id to move ", idToMove);
    if (idToMove != "") {
      if(this.sixArray.length>0){
        this.sixArray.forEach((movementAmount, index) => {
          if (movementAmount == this.movementAmount) {
            this.movementAmount = movementAmount;
            this.sixArray.splice(index, 1);
            //console.log("remove the number from array ", this.movementAmount);
          }
        });
      }
      this.moveGotti(idToMove);

      return true;
    }
    return false;
  }
  AIUnlockPiece(): boolean {
    console.log("movement amt. in AI Unlock ", this.movementAmount);
    console.log(
      "can AI unlocked ",
      this.sixArray.length,
      " ",
      this.gottisInside[this.playerIndex].length,
      " ",
      this.sixArray.indexOf(6)
    );
    if (
      this.sixArray.length > 0 &&
      this.gottisInside[this.playerIndex].length &&
      this.sixArray.indexOf(6) != -1
    ) {
      this.movementAmount = this.sixArray[this.sixArray.indexOf(6)];
      this.sixArray.splice(this.sixArray.indexOf(6), 1);
      this.moveGotti(this.gottisInside[this.playerIndex][0]);
      return true;
    }
    return false;
  }
  canAIKill(): boolean {
    if(this.sixArray.length>0)
    this.movementAmount = this.sixArray[0];
    console.log("movement amt. in AI Kill ", this.movementAmount);
    let eachPiecePosition = [];
    let eachPieceFinalPos = [];
    let eachPieceResult = [];
    let eachPieceId = [];
    for (let j = 0; j < this.gottisOutside[this.playerIndex].length; j++) {
      eachPieceId[j] = this.gottisOutside[this.playerIndex][j];
      let positions = [];
      let currPos =
        this.allGottis[this.playerIndex][
          this.gottisOutside[this.playerIndex][j]
        ];
      let finalPos = currPos + this.movementAmount;
      let result = {
        killed: "",
        powerUp: "",
        gottiHome: "",
        gameFinished: null,
      };
      for (let i = currPos; i <= finalPos; i++) {
        if (i == 69) {
          i = 1;
          finalPos = finalPos % 68;
        }
        positions.push(i);
        if (i == 117 || i == 127 || i == 137 || i == 107) {
          result["gottiHome"] = this.gottisOutside[this.playerIndex][j];
        }
        if (this.currentPlayerColor == "red" && i == CONSTANTS.redStop) {
          finalPos = CONSTANTS.redEntry + finalPos - i - 1;
          i = CONSTANTS.redEntry - 1;
        } else if (
          this.currentPlayerColor == "green" &&
          i == CONSTANTS.greenStop
        ) {
          finalPos = CONSTANTS.greenEntry + finalPos - i - 1;
          i = CONSTANTS.greenEntry - 1;
        } else if (
          this.currentPlayerColor == "blue" &&
          i == CONSTANTS.blueStop
        ) {
          finalPos = CONSTANTS.blueEntry + finalPos - i - 1;
          i = CONSTANTS.blueEntry - 1;
        } else if (
          this.currentPlayerColor == "yellow" &&
          i == CONSTANTS.yellowStop
        ) {
          finalPos = CONSTANTS.yellowEntry + finalPos - i - 1;
          i = CONSTANTS.yellowEntry - 1;
        }
      }
      console.log("moving throught positions canAIKill-----------");
      console.log(positions);
      eachPiecePosition[j] = positions;
      console.log("Final Position canAIKill -> ", finalPos);
      eachPieceFinalPos[j] = finalPos;
      console.log("Result of each Piece canAIKill ", result);

      console.log("moving throught positions canAIKill-----------");

      if (!CONSTANTS.starPositions.includes(finalPos)) {
        console.log(
          "Game.oppPositions canAIKill -> ",
          this.oppPositions,
          " has own prop - > ",
          this.oppPositions.hasOwnProperty(finalPos),
          "    ",
          finalPos
        );
        if (this.oppPositions.hasOwnProperty(finalPos)) {
          let killed = this.oppPositions[finalPos];
          console.log("someone is going to be been murdered");
          console.log(killed);
          console.log("someone is going to be been murdered");
          let r = {
            killed: killed,
          };
          result["killed"] = r["killed"];
        }
        eachPieceResult[j] = result;
      }
    }
    console.log(
      "Arrays in can AI kill home",
      "\n",
      eachPiecePosition,
      "\n",
      eachPieceFinalPos,
      "\n",
      eachPieceResult,
      "\n",
      eachPieceId
    );
    let idToCut = "";
    eachPieceResult.forEach((result, index) => {
      if (result.killed != "") {
        idToCut = eachPieceId[index];
        return;
      }
    });
    if (idToCut != "") {
      if(this.sixArray.length>0){
        this.sixArray.forEach((movementAmount, index) => {
          if (movementAmount == this.movementAmount) {
            this.movementAmount = movementAmount;
            this.sixArray.splice(index, 1);
            //console.log("remove the number from array ", this.movementAmount);
          }
        });
      }
      
      this.moveGotti(idToCut);
      return true;
    }
    return false;
  }
  async moveGotti(id) {
    if (this.hasMoved == 0) {
      this.playerTurnCount.forEach((attr, index) => {
        if (index == this.playerIndex) {
          attr.count = 0;
          console.log("playerTurnCount will be zero now -> ", attr);
          return;
        }
      });
      if (this.allGottis[this.playerIndex][id] == 0) {
        console.log("get gotti out if 6");
        this.getGottiOut(id);
      } else {
        let positions = [];
        let currPos = this.allGottis[this.playerIndex][id];
        let finalPos = currPos + this.movementAmount;
        let result = {
          killed: "",
          powerUp: "",
          gottiHome: "",
          gameFinished: null,
        };
        for (let i = currPos; i <= finalPos; i++) {
          if (i == 69) {
            i = 1;
            finalPos = finalPos % 68;
          }
          positions.push(i);
          if (i == 117 || i == 127 || i == 137 || i == 107) {
            result["gottiHome"] = id;
            this.ghotihome[this.playerIndex] += 1;

            if (this.ghotihome[this.playerIndex] == 4) {
              result["gameFinished"] = this.playerIndex;
            } else {
              this.noPlayerChange = 1;
              clearTimeout(this.timeOut);
              this.turnTimer(1);

              this.room.broadcast("playerIndicator1", {
                currentPlayerColor: this.currentPlayerColor,
                id: this.players[this.playerIndex].sock.id,
              });
              if (this.players[this.playerIndex].sock.id == "AI") {
                setTimeout(()=>this.makeRoll(), 5000);
              }
            }
          }
          if (this.currentPlayerColor == "red" && i == CONSTANTS.redStop) {
            finalPos = CONSTANTS.redEntry + finalPos - i - 1;
            i = CONSTANTS.redEntry - 1;
          } else if (
            this.currentPlayerColor == "green" &&
            i == CONSTANTS.greenStop
          ) {
            finalPos = CONSTANTS.greenEntry + finalPos - i - 1;
            i = CONSTANTS.greenEntry - 1;
          } else if (
            this.currentPlayerColor == "blue" &&
            i == CONSTANTS.blueStop
          ) {
            finalPos = CONSTANTS.blueEntry + finalPos - i - 1;
            i = CONSTANTS.blueEntry - 1;
          } else if (
            this.currentPlayerColor == "yellow" &&
            i == CONSTANTS.yellowStop
          ) {
            finalPos = CONSTANTS.yellowEntry + finalPos - i - 1;
            i = CONSTANTS.yellowEntry - 1;
          }
        }
        console.log("moving throught positions-----------");
        console.log(positions);
        console.log("moving throught positions-----------");
        //console.log(
        //   "position inside movegotti: -> ",
        //   positions[positions.length - 1]
        // );
        if (positions[positions.length - 1] != 0) {
          this.allGottis[this.playerIndex][id] =
            positions[positions.length - 1];
          this.allGottisAfterReconnection[this.playerIndex][id] =
            positions[positions.length - 1];
        }
        //checing final position for any gotti or powerUp
        let r = this.checkFinalPosition(this.allGottis[this.playerIndex][id]);
        console.log("move gotti r -> ", r);
        let sixOrnot = 0;
        if (this.sixArray.length >= 1) {
          sixOrnot = 1;
        } else {
          sixOrnot = 0;
          this.sixCount = 0;
        }
        console.log("sixOrnot: ", sixOrnot);
        result["killed"] = r["killed"];
        result["powerUp"] = r["powerUp"];
        // this.players.forEach(async (player: any) => {
        //     if (player)

        await this.room.broadcast("moveGotti", {
          id: id,
          playerIndex: this.playerIndex,
          positions: positions,
          gottisInside: this.gottisInside,
          gottisOutside: this.gottisOutside,
          result: result,
          currentPlayerId: this.players[this.playerIndex].sock.id,
          sixOrnot: sixOrnot,
        });
        // if (this.players[this.playerIndex].sock.id == "AI") {
        //   console.log("AI turn after move");
        //   if (this.sixArray.length) {
        //     this.checkIfmoveCanbeMade();
        //     if (this.sixArray.length) {
        //       this.movePlayerGottis();
        //     }
        //   }else if(result.killed || result.gottiHome){
        //     this.makeRoll();
        //   }
        //    else {
        //     console.log("changing turn due to no piece could be moved by AI");
        //     this.sixCount = 0;
        //      this.playerIndicator();
        //   }
        // }
        // });
      }
    }
  }
  async getGottiOut(id) {
    if (this.hasMoved == 0) {
      //niskeko gotti lai gottisOutside ko array ma append garni
      let ind = this.gottisInside[this.playerIndex].indexOf(id);
      if (ind >= 0) this.gottisInside[this.playerIndex].splice(ind, 1);
      this.gottisOutside[this.playerIndex].push(id);
      let position = 0;
      if (id.includes("red")) position = CONSTANTS.startRed;
      else if (id.includes("green")) position = CONSTANTS.startGreen;
      else if (id.includes("blue")) position = CONSTANTS.startBlue;
      else position = CONSTANTS.startYellow;
      //console.log("position inside getGottiOut: -> ", position);
      this.allGottis[this.playerIndex][id] = position;
      this.allGottisAfterReconnection[this.playerIndex][id] = position;
      var sixOrnot = 0;
      if (this.sixArray.length >= 1) {
        sixOrnot = 1;
      } else {
        sixOrnot = 0;
      }
      console.log("getting gotti out", sixOrnot);
      // this.players.forEach(async player => {
      //if (player)
      // if (this.players[this.playerIndex].sock.id == "AI") {
      //   console.log("AI turn after move");
      //   if (this.sixArray.length) {
      //     this.checkIfmoveCanbeMade();
      //     if (this.sixArray.length) {
      //       this.movePlayerGottis();
      //     }
      //   } else {
      //     console.log("changing turn due to no piece could be moved by AI");
      //     this.sixCount = 0;
      //     this.playerIndicator();
      //   }
      // }
      await this.room.broadcast("getGottiOut", {
        id: id,
        position: position,
        gottisInside: this.gottisInside,
        gottisOutside: this.gottisOutside,
        sixOrnot: sixOrnot,
        currentPlayerId: this.players[this.playerIndex].sock.id,
      });
      // });
    }
  }
  powerUpClicked(type) {
    //CONSTANTS.timer.cancel();
    this.players[this.playerIndex].sock.send("removePowerUp", { type: type });
    let ind = this.powerUps[this.playerIndex].indexOf(type);
    this.powerUps[this.playerIndex].splice(ind, 1);
    if (type.includes("freeRoll")) {
      this.noPlayerChange = 1;
    } else if (type.includes("skipTurn")) {
      this.playerIndex = (this.playerIndex + 1) % 4;
      while (!this.allGottis.hasOwnProperty(this.playerIndex)) {
        this.playerIndex = (this.playerIndex + 1) % 4;
      }
    } else if (type.includes("killAnyGotti")) {
      this.isPowerUpRunning = 1;
      this.clickAble = 1;
      this.movableGottis = [];
      for (let key in this.oppPositions) {
        if (
          this.oppPositions.hasOwnProperty(key) &&
          !CONSTANTS.starPositions.includes(parseInt(key))
        ) {
          this.movableGottis.push(this.oppPositions[key]);
        }
      }
      if (this.movableGottis.length == 0) {
        this.noPlayerChange = 0;
        this.isPowerUpRunning = 0;
        return;
      } else {
        this.noPlayerChange = 1;
        this.players[this.playerIndex].sock.send("addShakeAnimation", {
          movableGottis: this.movableGottis,
        });
      }
    }
  }

  async findMovableGottis() {
    console.log("findMovableGottis");
    for (let key in this.allGottis[this.playerIndex]) {
      if (this.allGottis[this.playerIndex].hasOwnProperty(key)) {
        if (this.allGottis[this.playerIndex][key] == 0) {
          if (this.movementAmount == 6) {
            console.log("Movement amount is 6 inside find gotti to move");
            this.movableGottis.push(key);
          }
        } else if (this.isOnFinishLine(this.allGottis[this.playerIndex][key]))
          this.movableGottis.push(key);
      }
    }
    console.log("movableGottis: ", this.movableGottis);
    let movableGottisPositions = [];
    this.movableGottis.forEach((id) => {
      movableGottisPositions.push(this.allGottis[this.playerIndex][id]);
    });
    if (
      this.movableGottis.length != 0 &&
      this.movableGottis.length != 1 &&
      this.gottisOutside[this.playerIndex].length != 0
    ) {
      if (movableGottisPositions.every((val, i, arr) => val === arr[0])) {
        // console.log(
        //   "moving the piece automatic if every one is on same position"
        // );
      } else {
        if (this.players[this.playerIndex].sock.id == "AI") {
          // this.makeRoll()
          console.log("AI move findMovableGottis");
          this.AIDecisionMaking();
        } else {
          await this.players[this.playerIndex].sock.send("addShakeAnimation", {
            movableGottis: this.movableGottis,
          });
        }
      }
    } else {
      // console.log(
      //   "moving the piece automatic if every one is on same position 2"
      // );
    }
  }
  isOnFinishLine(currPos) {
    if (currPos >= 100) {
      if (
        (currPos >= 100 && currPos + this.movementAmount <= 107) ||
        (currPos >= 110 && currPos + this.movementAmount <= 117) ||
        (currPos >= 120 && currPos + this.movementAmount <= 127) ||
        (currPos >= 130 && currPos + this.movementAmount <= 137)
      ) {
        return 1;
      } else {
        return 0;
      }
    } else return 2;
  }

  //returns the killed gotti name or the powerUp name or 0 for nothing
  checkFinalPosition(fd) {
    if (!CONSTANTS.starPositions.includes(fd)) {
      console.log("Game.oppPositions -> ", this.oppPositions);
      if (this.oppPositions.hasOwnProperty(fd)) {
        let killed = this.oppPositions[fd];
        console.log("someone has been murdered");
        console.log(killed);
        console.log("someone has been murdered");
        this.noPlayerChange = 1;
        clearTimeout(this.timeOut);
        this.turnTimer(1);

        this.room.broadcast("playerIndicator1", {
          currentPlayerColor: this.currentPlayerColor,
          id: this.players[this.playerIndex].sock.id,
        });
        if (this.players[this.playerIndex].sock.id == "AI") {
          setTimeout(()=>this.makeRoll(), 5000);
          
        }
        return {
          killed: killed,
          powerUp: "",
        };
      } else if (this.powerUpsLocation.hasOwnProperty(fd)) {
        this.powerUps[this.playerIndex].push(this.powerUpsLocation[fd]);
        delete this.powerUpsLocation[fd];
        return {
          killed: "",
          powerUp: fd,
        };
      }
      return 0;
    }
    return 0;
  }
}
