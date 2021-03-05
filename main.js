const bot = require('rocketchat-node-framework');
const auth = require('./auth.json');
const axios = require('axios');
const signAuto = 'https://spot.cat.pdx.edu/api/external/timesheet/sign-auto/';
const signIn = 'https://spot.cat.pdx.edu/api/external/timesheet/sign-in/';
const signOut = 'https://spot.cat.pdx.edu/api/external/timesheet/sign-out/';
const state = 'https://spot.cat.pdx.edu/api/external/timesheet/state/';

bot.runbot({
    HOST: auth.host,  //server url for rocket
    USER: auth.username,        //login username for bot
    PASS: auth.password,        //login password for bot
    SSL: 'false',               //specify if using SSL, true = SSL false = no SSL
    ROOMS: [],        //a list of rooms the bot will join on login
    MUSTBEMENTIONED: true,      //true = bot must be @ to recieve messages

    onMessage: processMessage   //define function to deal with messages
})


async function processMessage(messageObj, replyTo) {
    if(messageObj.room != 'clock') {
        let options = { dm: messageObj.author }
        replyTo(messageObj, "Please only use this bot in #Clock", options);
        return;
    }

    let command = messageObj.message.split(" ");
    let author = messageObj.author;
    console.log("processing reply");
    console.log(command[1]);
    console.log("Author: " + author);

    if (command[1] == null) {
        replyTo(messageObj, "Incorrect Input, please try again or use help");
    }
    else if (command[2] == null && command[1].toLowerCase() == "help") {
        replyTo(messageObj, "This bot is for Signing in and Signing out on your Remote Shifts" +
            "\n\"Sign in\" Signs you in for your shift!" +
            "\n\"Sign out\" Signs you out for your shift!" +
            "\n\"Sign in -force\" Forces a sign in regardless of a sign out (please don't use this unless you know what you are doing)" +
            "\n\"Sign out -force\" Forces a sign out regardless of a sign in (please don't use this unless you know what you are doing)" +
            "\n Note: SPOT manages your timesheet, check it regularly to make sure everything is correct!" +
            "\nEasy as pie! If you have further questions, suggestions or if this bot dies ping Bishop!");
    }
    else {
        if(!command[2]) { replyTo(messageObj, "Incorrect Input, please try again or use help"); }
        switch (command[1].toLowerCase() + " " + command[2].toLowerCase()) {
            case "sign in":
                clock(command, author, messageObj, replyTo);
                break;
            case "sign out":
                clock(command, author, messageObj, replyTo);
                break;
            default:
                replyTo(messageObj, "Incorrect Input, please try again or use help");
                break;
        }
    }
    
}

//gets the last signin/out time and returns an error if the user is trying to do a double punch
async function getLastSign(user) {
    let status = null;
    await axios.get(state + user + auth.key)
        .then(function (response) {
            // handle success
            status = response.data.state;
        })
        .catch(function (error) {
            // handle error
            console.log(error);
            status = null;
        })
    return status;
}

//one clock function since we need to do less work, SPOT api does most of the work for us
async function clock(command, author, messageObj, replyTo) {
    let com = command[1] + " " + command[2];
    if (com != null) { com = com.toLowerCase();}

    console.log(com);

    let user = author;
    let option = "auto";
    let force = false;
    let status = await getLastSign(user);

    let failed = true;

    if (com == "sign in" && command[3] != "-force" && status != "signed-in") { replyTo(messageObj, "Signing you in " + user); failed = false; }
    else if(com == "sign in" && command[3] != "-force" && status == "signed-in") { replyTo(messageObj, "It looks like you are already signed in. If you forgot to sign out then use \"Sign in -force\" to make a new punch"); return;}

    if (com == "sign out" && command[3] != "-force" && status != "signed-out") { replyTo(messageObj, "Signing you out " + user); failed = false;}
    else if(com == "sign out" && command[3] != "-force" && status == "signed-out") { replyTo(messageObj, "It looks like you are already signed out. If you forgot to sign in then use \"Sign out -force\" to make a new punch"); return;}

    if (com == "sign in" && command[3] == "-force") { replyTo(messageObj, "Signing you in forcefully " + user); force = true; option = "in"; failed = false;}
    if (com == "sign out" && command[3] == "-force") { replyTo(messageObj, "Signing you out forcefully " + user); force = true; option = "out"; failed = false;}
    if(failed == true) { replyTo(messageObj, "I do not understand your request, please try again or use the \"help\" command"); return; }


    //structure is signAuto + user + key 
    if (force == false) {
        axios.get(signAuto + user + auth.key)
            .then(function (response) {
                // handle success
                console.log(response.data.message);
                //event.respond(response.data.message);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
                //event.respond(error);
            })
    }
    else if (option == "in") {
        axios.get(signIn + user + auth.key)
            .then(function (response) {
                // handle success
                console.log(response);
                //event.respond(response.data.message);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
                //event.respond(error);
            })
    }
    else if (option == "out") {
        axios.get(signOut + user + auth.key)
            .then(function (response) {
                // handle success
                console.log(response);
                //event.respond(response.data.message);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
                //event.respond(error);
            })
    }
}
