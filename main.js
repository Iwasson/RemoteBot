const bot = require('node-rocketchat-bot');
const keys = require('./keys.json');
const axios = require('axios');
const { sendToRoom } = require('@rocket.chat/sdk/dist/lib/driver');
const signAuto = 'https://spot.cat.pdx.edu/api/external/timesheet/sign-auto/';
const signIn = 'https://spot.cat.pdx.edu/api/external/timesheet/sign-in/';
const signOut = 'https://spot.cat.pdx.edu/api/external/timesheet/sign-out/';
const state = 'https://spot.cat.pdx.edu/api/external/timesheet/state/';

function main() {
    //console.log(words);
    bot({
        host: keys.host,
        username: keys.username,
        password: keys.password,
        // use ssl for https
        ssl: true,
        pretty: false,
        // join room(s)
        rooms: ['bots'],
        // when ready (e.log.info logs to console, can also console.log)
        onWake: async event => event.log.info(`${event.bot.username} ready`),
        // on message
        onMessage: async event => {
            if (event.flags.isMentioned && event.room.id == 'GENERAL') {
                const words = event.message.content.split(' ');
                const operation = words[1] ? words[1].toLowerCase() : ''
                event.log.info(`operation is "${operation}"`)
                processCommand(words, event);
            }
            else if(event.flags.isMentioned) {
                notifyBadChannel(event);
            }
        }
    });
}

async function notifyBadChannel(event) {
    let user = event.message.author.username;
    sendToRoom("@" + user + " Please only send me messages here!", 'GENERAL');
}

async function processCommand(words, event) {
    if (words[1] == null) {
        event.respond("Incorrect Input, please try again or use help");
    }
    else if (words[2] == null && words[1].toLowerCase() == "help") {
        event.respond("This bot is for Signing in and Signing out on your Remote Shifts" +
            "\n\"Sign in\" Signs you in for your shift!" +
            "\n\"Sign out\" Signs you out for your shift!" +
            "\n\"Sign in -force\" Forces a sign in regardless of a sign out (please don't use this unless you know what you are doing)" +
            "\n\"Sign out -force\" Forces a sign out regardless of a sign in (please don't use this unless you know what you are doing)" +
            "\n Note: SPOT manages your timesheet, check it regularly to make sure everything is correct!" +
            "\nEasy as pie! If you have further questions, suggestions or if this bot dies ping Bishop!");
    }
    else {
        switch (words[1].toLowerCase() + " " + words[2].toLowerCase()) {
            case "sign in":
                clock(event, words);
                break;
            case "sign out":
                clock(event, words);
                break;
            default:
                event.respond("Incorrect Input, please try again or use help");
                break;
        }
    }
}

//gets the last signin/out time and returns an error if the user is trying to do a double punch
async function getLastSign(user) {
    let status = null;
    await axios.get(state + user + keys.key)
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
async function clock(event, words) {
    let command = words[1] + " " + words[2];
    if (command != null) { command = command.toLowerCase();}

    let user = event.message.author.username;
    let option = "auto";
    let force = false;
    let status = await getLastSign(user);

    let failed = true;

    if (command == "sign in" && words[3] != "-force" && status != "signed-in") { event.respond("Signing you in " + user); failed = false; }
    else if(command == "sign in" && words[3] != "-force" && status == "signed-in") { event.respond("It looks like you are already signed in. If you forgot to sign out then use \"Sign in -force\" to make a new punch"); return;}

    if (command == "sign out" && words[3] != "-force" && status != "signed-out") { event.respond("Signing you out " + user); failed = false;}
    else if(command == "sign out" && words[3] != "-force" && status == "signed-out") { event.respond("It looks like you are already signed out. If you forgot to sign in then use \"Sign out -force\" to make a new punch"); return;}

    if (command == "sign in" && words[3] == "-force") { event.respond("Signing you in forcefully " + user); force = true; option = "in"; failed = false;}
    if (command == "sign out" && words[3] == "-force") { event.respond("Signing you out forcefully " + user); force = true; option = "out"; failed = false;}
    if(failed == true) { event.respond("I do not understand your request, please try again or use the \"help\" command"); return; }


    //structure is signAuto + user + key 
    if (force == false) {
        axios.get(signAuto + user + keys.key)
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
        axios.get(signIn + user + keys.key)
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
        axios.get(signOut + user + keys.key)
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

main();