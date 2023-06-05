import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
export class LudoPlayer extends Schema {


    
    sock: any; 

    @type("number") 
    gameMode: number;

    @type("string") 
    profileUrl: string;

    @type("number") 
    inGame: boolean;

    

    
    // @type("number")
    // myPiece: number = 0;
    
    
    
    constructor(sock: any){
        super();
        try{
            
            this.sock = sock;
            this.gameMode = 0;
            this.profileUrl = '';
            this.inGame = false;

        }catch(e){
            console.log("Error has occured inside constructor of Player class - ", e);
        }
    }

    reset(){
       
       
    }

    replacePlayer( client, options ){
        
    }

}