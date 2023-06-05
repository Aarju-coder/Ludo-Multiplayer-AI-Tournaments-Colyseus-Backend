import * as UTILS from "./utils"

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
    starPositions: [1, 10, 18, 27, 35, 44, 52, 61],
    defaultColors: ['red', 'green', 'yellow', 'blue'],
    timer: '',
}
export class Game{
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
    movableGottis: any[];
    hasMoved: number;
    noPlayerChange: number;
    oppPositions: {};
    powerUpsLocation: {};
    gottisInside: string[][];
    gottisOutside: any[][];
    ghotihome: number[];
    clickAble: number;
    
    constructor(players) {
        this.playerIndex = 0;
        // this.availablePowerUps = ['freeRoll', 'skipTurn', 'killAnyGotti'];
        console.log("inside game");
        this.availablePowerUps = [];
        this.movementAmount = 0;
        this.gameEnded = 0
        this.sixCount = 0
        this.currentPlayerColor = ''
        this.isPowerUpActive = 0;
        this.isPowerUpRunning = 0;
        this.players = players;
        this.totalPlayersCount = players.length;
        this.winners = [];
        this.powerUps = [
            [],
            [],
            [],
            []
        ];

        //contains all the gottis as key and the positions as values red1=32
        this.allGottis = {};
        this.movableGottis = [];
        //indicates if a player has played his turn or not
        this.hasMoved = 1;
        this.noPlayerChange = 0;
        //holds opponent positions
        this.oppPositions = {}
        //indicates which location holds which powerups 1:freeRoll
        this.powerUpsLocation = {};
        this.gottisInside = [
            ['red1', 'red2', 'red3', 'red4'],
            ['green1', 'green2', 'green3', 'green4'],
            ['yellow1', 'yellow2', 'yellow3', 'yellow4'],
            ['blue1', 'blue2', 'blue3', 'blue4']
        ]
        this.gottisOutside = [
            [],
            [],
            [],
            []
        ],
        this.ghotihome=[
            0,
            0,
            0,
            0
        ]
    }
    async playerIndicator() {
        console.log("Player indicator");
        this.hasMoved = 1;
        this.movableGottis = [];
        if (this.sixCount == 0 && this.noPlayerChange == 0) {
            if (this.powerUps[this.playerIndex].length > 0) {
                // this.isPowerUpActive++;
                // if (this.isPowerUpActive == 1) {
                //     //power focus vanera event emit gar
                //     this.hasMoved = 0;
                //     CONSTANTS.timer = '';
                //     //indicate powerUps that can be used
                //     this.players[this.playerIndex].sock.emit("powerUpTime", "");
                //     // this.players.forEach(player => {
                //     //     if (player.sock) player.sock.emit("showMessage", "Powerup Time", this.currentPlayerColor)
                //     // });
                //     CONSTANTS.timer = new UTILS.Sleep(5000);
                //     await CONSTANTS.timer.wait();
                //     this.hasMoved = 1;
                //     //powerups bata focus hata vanera code han}
                // }
            }
            if (this.noPlayerChange == 0) {
                this.isPowerUpActive = 0;
                this.players.forEach(player => {
                    if (player) {
                        console.log("Player inside Plaayer indicator");
                        player.send("removeShakeAnimation",{ gottisInside: this.gottisInside, gottisOutside: this.gottisOutside});
                    }
                });
                this.playerIndex = (this.playerIndex + 1) % 4;
                while (!this.allGottis.hasOwnProperty(this.playerIndex)) {
                    this.playerIndex = (this.playerIndex + 1) % 4;
                }
                await new Promise(r => setTimeout(r, 300));
                if (this.playerIndex == 0) this.currentPlayerColor = "red";
                else if (this.playerIndex == 1) this.currentPlayerColor = "green";
                else if (this.playerIndex == 2) this.currentPlayerColor = "yellow";
                else if (this.playerIndex == 3) this.currentPlayerColor = "blue";
                //adds highlight around home of current player
                this.players.forEach(player => {
                    
                    if(player) {
                        console.log("sock emit Player Indicator");
                        player.send("playerIndicator",{currentPlayerColor: this.currentPlayerColor, id: this.players[this.playerIndex].id} );
                    }
                });
            }
        }
    }
    async makeRoll() {
        console.log("makeroll");
        this.hasMoved = 0;
        this.oppPositions = {};
        let myPositions = [];

        for (let key in this.allGottis) {
            if (this.allGottis.hasOwnProperty(key)) {
                for (let key2 in this.allGottis[key]) {
                    if (this.allGottis[key].hasOwnProperty(key2)) {
                        let val = this.allGottis[key][key2]
                        if (val > 0 && val < 100) {
                            if (parseInt(key) != this.playerIndex) this.oppPositions[val] = key2
                            else myPositions.push(val);
                        }
                    }
                }
            }
        }
        console.log("--------------------------------------------")
        console.log("gottis inside")
        console.log(this.gottisInside)
        console.log("gottis inside")
        console.log("gottis Outside")
        console.log(this.gottisOutside)
        console.log("gottis Outside")
        console.log("all gottis")
        console.log(this.allGottis)
        console.log("all gottis")
        console.log("oppositions")
        console.log(this.oppPositions)
        console.log("oppositions")
        console.log("powerUps positions")
        console.log(this.powerUpsLocation)
        console.log("powerUps positions")
        console.log("--------------------------------------------")
        //as he just rolled he still has to move his gotti
        // await this.players[this.playerIndex].emit("calculateAllGottiPos", this.gottisOutside);
        if (this.gottisOutside[this.playerIndex].length == 0) {
            this.movementAmount = UTILS.biasedRandom(6, 60)
            //sees if there is any players ahead and tries to cut it
        } else {
            let biases = [];
            myPositions.forEach(mine => {
                for (let key in this.oppPositions)
                    if ((parseInt(key) - mine) <= 6 && (parseInt(key) - mine) > 0) {
                        console.log("there is someone at" , parseInt(key) - mine);
                        biases.push(parseInt(key) - mine)
                    }
            })
            myPositions.forEach(mine => {
                for (let key in this.powerUpsLocation) {
                    if (parseInt(key) - mine <= 6 && (parseInt(key) - mine) > 0) {
                        console.log("a powerUp at" , parseInt(key) - mine);
                        biases.push(parseInt(key) - mine);
                    }
                }
            })
            //cuts players with 30% chance
            if (biases.length > 0) {
                this.movementAmount = UTILS.biasedRandom(biases, 30)
            } else this.movementAmount = UTILS.biasedRandom(6, 20)
        }
        console.log("the movement amount came to be " + this.movementAmount)
        this.players.forEach(async player => {
            if (player) await player.send("rollTheDice",{movementAmount: this.movementAmount, currentPlayerColor: this.currentPlayerColor})
        });
        await new Promise(r => setTimeout(r, 3000));
        await this.gameController();

    }
    async gameController() {
        console.log("inside gameController");
        this.noPlayerChange = 0;
        if (this.movementAmount != 6) this.sixCount = 0;
        else this.sixCount++;
        if (this.sixCount != 3) {
            //j aayepani shake animation halney code same nai hunxa
            await this.findMovableGottis();
            //waiting for the calculations to be sent from the client to the server
            if (this.movableGottis.length == 0) this.playerIndicator();
            else if (this.movableGottis.length == 1) {
                await this.moveGotti(this.movableGottis[0]);
            } else {
                let movableGottisPositions = [];
                this.movableGottis.forEach((id) => {
                    movableGottisPositions.push(this.allGottis[this.playerIndex][id]);
                })
                if (this.gottisOutside[this.playerIndex].length == 0) await this.moveGotti(this.movableGottis[0]);
                //checks if all the available gottis are in the same position
                else if (movableGottisPositions.every((val, i, arr) => val === arr[0])) {
                    this.moveGotti(this.movableGottis[0])
                }

            }
        } else {
            this.sixCount = 0;
            this.playerIndicator();
        }
    }
    async moveGotti(id) {
        if (this.hasMoved == 0) {
            if (this.allGottis[this.playerIndex][id] == 0) {
                this.getGottiOut(id)
            } else {
                let positions = [];
                let currPos = this.allGottis[this.playerIndex][id];
                let finalPos = currPos + this.movementAmount;
                let result = {
                    "killed": '',
                    "powerUp": '',
                    "gottiHome": '',
                    "gameFinished": 0,
                };
                for (let i = currPos; i <= finalPos; i++) {
                    if (i == 69) {
                        i = 1;
                        finalPos = finalPos % 68;
                    }
                    positions.push(i);
                    if (i == 117 || i == 127 || i == 137 || i == 107) {
                        result["gottiHome"] = id;
                        this.ghotihome[this.playerIndex]+=1;
                        this.noPlayerChange = 1;
                        if (this.ghotihome[this.playerIndex] == 4) {
                            result['gameFinished'] = this.playerIndex;
                        }
                    }
                    if (this.currentPlayerColor == "red" && i == CONSTANTS.redStop) {
                        finalPos = CONSTANTS.redEntry + finalPos - i - 1;
                        i = CONSTANTS.redEntry - 1;
                    } else if (this.currentPlayerColor == "green" && i == CONSTANTS.greenStop) {
                        finalPos = CONSTANTS.greenEntry + finalPos - i - 1;
                        i = CONSTANTS.greenEntry - 1;
                    } else if (this.currentPlayerColor == "blue" && i == CONSTANTS.blueStop) {
                        finalPos = CONSTANTS.blueEntry + finalPos - i - 1;
                        i = CONSTANTS.blueEntry - 1;
                    } else if (this.currentPlayerColor == "yellow" && i == CONSTANTS.yellowStop) {
                        finalPos = CONSTANTS.yellowEntry + finalPos - i - 1;
                        i = CONSTANTS.yellowEntry - 1;
                    }
                }
                console.log("moving throught positions-----------")
                console.log(positions)
                console.log("moving throught positions-----------")
                this.allGottis[this.playerIndex][id] = positions[positions.length - 1];
                //checing final position for any gotti or powerUp
                let r = this.checkFinalPosition(this.allGottis[this.playerIndex][id]);
                result['killed'] = r['killed']
                result['powerUp'] = r['powerUp']
                this.players.forEach(async (player: any) => {
                    if (player) await player.send("moveGotti",{id: id, playerIndex: this.playerIndex, positions: positions, gottisInside: this.gottisInside,gottisOutside: this.gottisOutside,result: result, currentPlayerId : this.players[this.playerIndex].id})
                });
            }
        }
    }
    getGottiOut(id) {
        if (this.hasMoved == 0) {
            //niskeko gotti lai gottisOutside ko array ma append garni
            let ind = this.gottisInside[this.playerIndex].indexOf(id);
            if (ind >= 0) this.gottisInside[this.playerIndex].splice(ind, 1)
            this.gottisOutside[this.playerIndex].push(id)
            let position = 0;
            if (id.includes("red")) position = CONSTANTS.startRed
            else if (id.includes("green")) position = CONSTANTS.startGreen
            else if (id.includes("blue")) position = CONSTANTS.startBlue
            else position = CONSTANTS.startYellow
            this.allGottis[this.playerIndex][id] = position;
            this.players.forEach(async player => {
                if (player) await player.send("getGottiOut", {id: id, position:position, gottisInside:this.gottisInside, gottisOutside: this.gottisOutside})
            });
        }
    }
    powerUpClicked(type) {
        //CONSTANTS.timer.cancel();
        this.players[this.playerIndex].send("removePowerUp", {type: type})
        let ind = this.powerUps[this.playerIndex].indexOf(type);
        this.powerUps[this.playerIndex].splice(ind, 1);
        if (type.includes("freeRoll")) {
            this.noPlayerChange = 1;
        } else if (type.includes("skipTurn")) {
            this.playerIndex = (this.playerIndex + 1) % 4;
            while (!this.allGottis.hasOwnProperty(this.playerIndex)) {
                this.playerIndex = (this.playerIndex + 1) % 4;
            }
        } else if ((type.includes("killAnyGotti"))) {
            this.isPowerUpRunning = 1;
            this.clickAble = 1;
            this.movableGottis = []
            for (let key in this.oppPositions) {
                if (this.oppPositions.hasOwnProperty(key) && !CONSTANTS.starPositions.includes(parseInt(key))) {
                    this.movableGottis.push(this.oppPositions[key])
                }
            }
            if (this.movableGottis.length == 0) {
                this.noPlayerChange = 0;
                this.isPowerUpRunning = 0;
                return
            } else {
                this.noPlayerChange = 1;
                this.players[this.playerIndex].send("addShakeAnimation", {movableGottis: this.movableGottis})
            }
        }
    }

    async findMovableGottis() {
        for (let key in this.allGottis[this.playerIndex]) {
            if (this.allGottis[this.playerIndex].hasOwnProperty(key)) {
                if (this.allGottis[this.playerIndex][key] == 0) {
                    if (this.movementAmount == 6) this.movableGottis.push(key)
                } else if (this.isOnFinishLine(this.allGottis[this.playerIndex][key])) this.movableGottis.push(key)
            }
        }
        await this.players[this.playerIndex].send("addShakeAnimation", {movableGottis:this.movableGottis});
    }
    isOnFinishLine(currPos) {
        if (currPos >= 100) {
            if ((currPos >= 100 && currPos + this.movementAmount <= 107) || (currPos >= 110 && currPos + this.movementAmount <= 117) || (currPos >= 120 && currPos + this.movementAmount <= 127 || (currPos >= 130 && currPos + this.movementAmount <= 137))) {
                return 1;
            } else {
                return 0;
            }
        } else return 2;
    }


    //returns the killed gotti name or the powerUp name or 0 for nothing
    checkFinalPosition(fd) {
        if (!CONSTANTS.starPositions.includes(fd)) {
            if (this.oppPositions.hasOwnProperty(fd)) {
                let killed = this.oppPositions[fd];
                console.log("someone has been murdered")
                console.log(killed);
                console.log("someone has been murdered")
                this.noPlayerChange = 1;
                return {
                    "killed": killed,
                    "powerUp": ''
                };
            } else if (this.powerUpsLocation.hasOwnProperty(fd)) {
                this.powerUps[this.playerIndex].push(this.powerUpsLocation[fd]);
                delete this.powerUpsLocation[fd]
                return {
                    "killed": '',
                    "powerUp": fd
                };
            }
            return 0
        }
        return 0
    }
















}