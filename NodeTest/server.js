//Modules Required
var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var path = require('path');
var http = require('http');

//This is the server configuration
var appSettings = require('./appSettings.json');

//These are the rules for the game itself.
var gameRules = require('./gameRules.json');

//Custom Modules
var utils = require('utils');
var gameEngine = require('engine');
var app = express();

//Parameters to store values
var movies = [];
var rooms = [];
var players = [];

//Create a new Player Object
var createPlayer = gameEngine.createPlayerDto;

//Create a new Room Object
var createRoom = gameEngine.createRoomDto;
var numberOfMovies = parseInt(gameRules.MaxRounds, 10) + 1;
var viewsDir = '/views/';

app.use(express.static(__dirname + viewsDir));
app.use("/css", express.static(__dirname + '/css'));
app.use("/fonts", express.static(__dirname + '/fonts'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/scripts", express.static(__dirname + '/scripts'));
app.use("/scripts/App", express.static(__dirname + '/scripts/App'));
app.use("/node_modules", express.static(__dirname + '/node_modules'));

//Server Properties
var ipToUse = appSettings.ipToUse;
var portToUse = appSettings.portToUse;

//Initialize Pub/Sub
var faye = require('faye');

//Create a new Player
app.get('/createPlayer', function (req, res) {
    var result = true;
    var playerName = req.query.playerName;
    
    for (var i = 0; i < players.length; i++) {
        //Get the player
        var player = players[i];
        
        //Check that the room name doesn't already exist
        if (player.playerName === playerName) {
            result = false;
            break;
        }
    }
    
    if (result) {
        var newPlayer = createPlayer(playerName);
        
        players.push(newPlayer);
        res.send(newPlayer);
    } else {
        res.sendResult(result);
    }
});

//Create a new room for players to play in
app.get('/createRoom', function (req, res) {
    var roomName = req.query.roomName;
    var playerName = req.query.playerName;
    
    var result = true;
    
    for (var i = 0; i < rooms.length; i++) {
        //Get the room
        var room = rooms[i];
        
        //Does a room with this name already exist
        if (room.RoomName == roomName) {
            result = false;
            break;
        }
    }
    
    //The room name is unique, create the room
    if (result) {
        var newPlayer = createPlayer(playerName);
        var movieData = gameEngine.getRandomMovieList(numberOfMovies, movies);
        var newRoom = createRoom(roomName, [newPlayer], movieData, gameRules);
        rooms.push(newRoom);
        res.send(newRoom);
    } else {
        res.sendStatus(result);
    }
});

app.get('/getRules', function (req, res) {
    res.send(gameRules);
});

//Try to join a room that has already been setup.
app.get('/joinRoom', function (req, res) {
    var roomName = req.query.roomName;
    var playerName = req.query.playerName;
    
    //Returns the room object.
    var result = gameEngine.joinRoom(rooms, roomName, playerName, gameRules);
    
    res.send(result);
});

//Get all rooms that are available for players to join
app.get('/getAvailableRooms', function (req, res) {
    var playerName = req.query.playerName;
    var availableRooms = gameEngine.getAvailableRooms(rooms, playerName);
    
    res.send(availableRooms);
});

app.get('/getRandomMovieList', function (req, res) {
    var newMovieArray = gameEngine.getRandomMovieList(numberOfMovies, movies);
    res.send(newMovieArray);
});

var server = app.listen(portToUse, ipToUse, function () {
    console.log("Get your popcorn ready, Movie Night is about to begin.");
    
    //Go and scrape the data from Imdb.com. Store the json results in a local variable accessible to our solution.
    console.log("Attempting to download movie data.");
    gameEngine.gameData(request, cheerio, fs, readyMessage);
    
    function readyMessage(movieData) {
        movies = movieData;
        console.log('IMDB movie data stealing complete.');
        var address = 'http://' + ipToUse + ":" + portToUse;
        console.log('Setup is complete.\nPlease go to the following URL in your browser : ' + address);
    }
});

var bayeux = new faye.NodeAdapter({ mount: '/faye' });
bayeux.attach(server);

// routes to serve the static HTML files
app.get('/', function (req, res) {
    res.sendFile(viewsDir + 'Index.html');
});

//Page not found error handler
app.use(function (req, res, next) {
    res.status(404);
    
    // respond with html page
    if (req.accepts('html')) {
        res.sendFile(__dirname + viewsDir + '404.html');
        return;
    }
    
    // default to plain-text. send()
    res.type('txt').send('Not found');
});

//Server error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.sendFile(__dirname + viewsDir + '500.html');
});

app.listen('8081');
exports = module.exports = app;