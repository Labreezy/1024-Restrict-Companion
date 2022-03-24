var base = Module.findBaseAddress('sonic2app.exe');
var orderbase = Module.findBaseAddress('order.dll');
//constants
const HUNT_STAGE_IDS = [5,7,8,16,18,25,26,32,44];
const LDATA_STRUCT_SIZE = 0xC;
var SETS_TO_PRACTICE = [];
//rng shuffling
var deathsrestartsptr = base.add(0x1534be8);
var setsafesptr = base.add(0x16edfd4);
var switchstatearrayptr = base.add(0x19e9461);
var nextseedptr = orderbase.add(0x117810);
var fnsetstate = base.add(0x3380a0);
//security hall
var fninitsecurityhall = base.add(0x235440);
var safe = -1;
var safeset = false;
//infinite lives
var lifeptr = base.add(0x134b024);
//upgrade
var tscopeaddr = base.add(0x19eb31a);
//exit game safety
/*var entermainmenuptr = base.add(0x284486);
var levelcount = -1;
    var leveldataptr = orderbase.add(0x117820);
    var n_levels = 0;
var thislevelptr = leveldataptr;
var thisid = thislevelptr.readU8();
while(thisid != 2){
    console.log(thisid);
    n_levels += 1;
    thislevelptr = thislevelptr.add(LDATA_STRUCT_SIZE);
    thisid = thislevelptr.readU8();
}

var internalleveldata = leveldataptr.readByteArray((n_levels+1)*LDATA_STRUCT_SIZE);
var internalleveldataptr = leveldataptr;
*/
recv("safe", function(msg){

    safe = msg.id;
});

recv("sets", function(msg){
    SETS_TO_PRACTICE = msg.sets;
    console.log("Received sets");
});
//death restart rng
Interceptor.attach(fnsetstate, {
   onEnter(args){
       var drs = deathsrestartsptr.readU8();

       if(drs > 0){
           var cseed = nextseedptr.readU16();
           cseed += 0x1327;
           cseed = cseed % 65535;
           nextseedptr.writeU16(cseed);
           console.log("Wrote new state");
       } else {
           if(SETS_TO_PRACTICE.length > 0){
               var rand_idx = Math.floor(Math.random() * SETS_TO_PRACTICE.length);
               nextseedptr.writeU16(SETS_TO_PRACTICE[rand_idx]);
               console.log("Wrote " + SETS_TO_PRACTICE[rand_idx]);
           }
       }
       //lives
       var lives = lifeptr.readU16();
       if (lives != 99){
           lifeptr.writeU16(99);
       }
       //i hope this fuckin works
       var tscopeflag = tscopeaddr.readU8();
       if(tscopeflag != 1){
           tscopeaddr.writeU8(1);
       }
   }
});
//safes
Interceptor.attach(fninitsecurityhall, {
    onEnter(args){
        if(safe != -1 && !safeset){

            console.log("Wrote safe " + safe);
            safeset = true;
            setsafesptr.writeU8(safe);
            for(var i=0; i<3; i++){
                var csafeptr = switchstatearrayptr.add(i);
                if(i == safe){
                    var flagval = csafeptr.readU8();
                    flagval = flagval & 1;
                    csafeptr.writeU8(flagval);
                } else {
                    var flagval = csafeptr.readU8();
                    if(flagval & 1){
                        csafeptr.writeU8(flagval - 1);
                    }
                }
            }

        }
    }
});
//exit game recovery
/*Interceptor.attach(entermainmenuptr, {
    onEnter(args){
        console.log("Main menu load detected");
        //console.log("Internal");
        //console.log(internalleveldata);
        leveldataptr.writeByteArray(internalleveldata);
        levelcount = -1;
    }
});*/