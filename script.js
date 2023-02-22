    var base = Module.findBaseAddress('sonic2app.exe');
var orderbase = Module.findBaseAddress('order.dll');
//constants
const HUNT_STAGE_IDS = [5,7,8,16,18,25,26,32,44];
const LDATA_STRUCT_SIZE = 0xC;
var SETS_TO_PRACTICE = [];
var curr_stage_ptr = ptr(0x1934b70);
//rng shuffling
var deathsrestartsptr = base.add(0x1534be8);
var setsafesptr = base.add(0x16edfd4);
var switchstatearrayptr = base.add(0x19e9461);
var nextseedptr = orderbase.add(0x117810);
var fnsetstate = base.add(0x3380a0);
//security hall
var fninitsecurityhall = base.add(0x235440);
var fnemeraldmanagerupdate = base.add(0x3395B8);
var safe = -1;
var safeset = false;
//infinite lives
var lifeptr = base.add(0x134b024);
//upgrade
var tscopeaddr = base.add(0x19eb31a);
//Replacement/no replacement handling
var replacement = true;
var sets_to_sample = [];
var current_setid = -1;
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
var m_w = 123456789;
var m_z = 987654321;
var mask = 4294967295; //0xFFFFFFFF
//since js can't seed its rng i said fuck it and made my own
function seed(i){
    m_w = (123456789 + i) & mask;
    m_z = (987654321 - i) & mask;
}
function seedable_random_u16(){
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
    result /= 4294967296; //result is anywhere between 0.0-1.0
    result *= 65535; //gets it into uint16 range
    result = Math.floor(result);
    return result;
}

recv("safe", function(msg){
    safe = msg.id;
});

recv("replacement", function(msg){
    replacement = Boolean(msg.data);
});

recv("sets", function(msg){
    SETS_TO_PRACTICE = msg.sets;
    sets_to_sample = [...SETS_TO_PRACTICE];
    console.log("Received sets");
});
//death restart rng
Interceptor.attach(fnsetstate, {
   onEnter(args){
       var drs = deathsrestartsptr.readU8();
       if(drs > 0){
           var curr_rand = seedable_random_u16();
           nextseedptr.writeU16(curr_rand);
           console.log("Wrote new state " + curr_rand);
       } else {
           if(SETS_TO_PRACTICE.length > 0){
               if (replacement) {
                    var rand_idx = Math.floor(Math.random() * SETS_TO_PRACTICE.length);
                    nextseedptr.writeU16(SETS_TO_PRACTICE[rand_idx]);
                    current_setid = SETS_TO_PRACTICE[rand_idx]
                    console.log("Wrote " + SETS_TO_PRACTICE[rand_idx]);
               } else {
                    var rand_idx = Math.floor(Math.random() * sets_to_sample.length);
                    nextseedptr.writeU16(sets_to_sample[rand_idx]);
                    current_setid = sets_to_sample[rand_idx];
                    console.log("Wrote " + sets_to_sample[rand_idx]);
                    sets_to_sample.splice(rand_idx, 1);
                    if (sets_to_sample.length == 0) {
                        sets_to_sample = [...SETS_TO_PRACTICE];
                    }
               }

           } else {
                var rand_idx = Math.floor(Math.random()*1024);
                nextseedptr.writeU16(rand_idx);
               // console.log("Wrote random set " + rand_idx);
                current_setid = rand_idx;
           }
           seed(nextseedptr.readU16()); //seed for deaths/restarts later
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
var last_state = 0;
var last_emeralds_spawned = 3;
//is it confirmed stuff
Interceptor.attach(fnemeraldmanagerupdate, { onEnter(){
    var manager = this.context.edi;
    var state = manager.readU8();
    var emeralds_spawned_ptr = manager.add(5)
    var emeralds_spawned = emeralds_spawned_ptr.readU8();
    if(state == 4 && emeralds_spawned != last_emeralds_spawned){
        console.log("Piece collected (" + emeralds_spawned + " piece(s) remaining)");
        if(emeralds_spawned == 0){
            send([curr_stage_ptr.readU8(),current_setid]);
        }
    }
    last_state = state;
    last_emeralds_spawned = emeralds_spawned;
}});

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