const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const spreadId = '1ZvDfvDtjjsV3WZ0N95lC49JUGQfh8VobuaM9FMJ_Oq8';
const bot = require('node-rocketchat-bot');
const keys = require('./keys.json');
const axios = require('axios');


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    //authorize(JSON.parse(content), listDevices);
    authorize(JSON.parse(content), main);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function main(auth) {
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
            if (event.flags.isMentioned) {
                const words = event.message.content.split(' ');
                const operation = words[1] ? words[1].toLowerCase() : ''
                event.log.info(`operation is "${operation}"`)
                processCommand(auth, words, event);
            }
        }
    });
}

async function processCommand(auth, words, event) {
    if(words[1] == null) {
        event.respond("Incorrect Input, please try again or use help");
    }
    else if (words[2] == null && words[1].toLowerCase() == "help") {
        event.respond("This bot is for Signing in and Signing out on your Remote Shifts" +
            "\n\"Sign in\" Signs you in for your shift!" +
            "\n\"Sign out\" Signs you out for your shift!" +
            "\nEasy as pie! If you have further questions, suggestions or if this bot dies ping Bishop!");
    }
    else {
        switch (words[1].toLowerCase() + " " + words[2].toLowerCase()) {
            case "sign in":
                clockOn(auth, event);
                break;
            case "sign out":
                clockOff(auth, event);
                break;
            default:
                event.respond("Incorrect Input, please try again or use help");
                break;
        }
    }
}

async function clockOn(auth, event) {
    let user = event.message.author.name;

    event.respond("Signing you in " + user);

    var date = new Date();

    var fullDate = date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
    var hour = date.getHours();
    var time = date.getMinutes();

    if (time < 10) {
        time = "0" + time;
    }

    var newRange = 'TimeLog!A2';


    const sheets = google.sheets({ version: 'v4', auth });

    const opt = {
        spreadsheetId: spreadId, //spreadsheet id
        range: 'TimeLog!A2:C1000'    //value range we are looking at
    };


    let data = await sheets.spreadsheets.values.get(opt);
    dataArray = data.data.values;


    let clockedOn = false;

    if (dataArray != null) {
        dataArray.forEach(element => {
            if (element[0] == user && element[2] == "N/A") {
                event.respond("You are already Signed in. Did you mean to Sign out?");
                clockedOn = true;
            }
        });
    }

    vals = {
        "range": "TimeLog!A2",
        "majorDimension": "ROWS",
        "values": [
            [user, hour + ":" + time, "N/A", fullDate],
        ],
    };

    const updateOptions = {
        spreadsheetId: spreadId,
        range: newRange,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: vals,
    };

    if (clockedOn == false) {
        let res = await sheets.spreadsheets.values.append(updateOptions);
    }
}

async function clockOff(auth, event) {
    let user = event.message.author.name;

    event.respond("Signing you out " + user);

    var date = new Date();

    var fullDate = date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
    var hour = date.getHours();
    var time = date.getMinutes();

    if (time < 10) {
        time = "0" + time;
    }

    const sheets = google.sheets({ version: 'v4', auth });

    const opt = {
        spreadsheetId: spreadId, //spreadsheet id
        range: 'TimeLog!A2:D1000'    //value range we are looking at
    };


    let data = await sheets.spreadsheets.values.get(opt);
    dataArray = data.data.values;

    let position = 2;
    let found = false;
    let pos = 0;

    if (dataArray != null) {
        dataArray.forEach(element => {
            if (element[0] == user && element[2] == "N/A") {
                pos = position;
                found = true;
            }
            position += 1;
        });
    }

    var newRange = 'TimeLog!A' + pos;

    vals = {
        "range": "TimeLog!A" + pos,
        "majorDimension": "ROWS",
        "values": [
            [null, null, hour + ":" + time, null],
        ],
    };

    const updateOptions = {
        spreadsheetId: spreadId,
        range: newRange,
        valueInputOption: 'USER_ENTERED',
        resource: vals,
    };

    if (found == false) {
        event.respond("It looks like you never Signed on, did you mean Sign on?")
    }
    else {
        let res = await sheets.spreadsheets.values.update(updateOptions);
    }
}