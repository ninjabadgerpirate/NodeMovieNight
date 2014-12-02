define(function (require) {
    var $ = require("jquery");
        
    //Player Screen
    var $Player = $("#Player");
    var $PlayerName = $("#PlayerName");
        
    //Welcome Screen    
    var $Welcome = $("#Welcome");
    var $btnCreateNewGame = $("#btnCreateNewGame");
    var $CurrentRooms = $("#CurrentRooms");
    var $CurrentRoomsHolder = $("#CurrentRoomsHolder");
    var $lblPlayerName = $("#lblPlayerName");
    
    //Opponents Screen
    var $RoomUrl = $("#RoomUrl");
    var $NoOpponent = $("#NoOpponent");
    
    //Questions Screen
    var $ScoresHolder = $("#ScoresHolder");
    var $lblCurrentRound = $("#lblCurrentRound");
    var $lblTotalRounds = $("#lblTotalRounds");
    var $Questions = $("#Questions");
    var $QuestionsHolder = $("#QuestionsHolder");
    var $lblOpponentName = $("#lblOpponentName");
    var $WaitingMessage = $("#WaitingMessage");
    var $lblPlayerNameHeading = $("#lblPlayerNameHeading");
    var $lblOpponentNameHeading = $("#lblOpponentNameHeading");
    
    //Results Screen
    var $Results = $("#Results");
    var $lblYourScore = $("#lblYourScore");
    var $lblYourOponentsScore = $("#lblYourOponentsScore");
    var $ResultsHolder = $("#ResultsHolder");
    
    //Model Properties
    var currentPlayer = {};
    var currentRoom = {};
    var currentRoomName = "";
    
    //Querystring Parameter
    var currentPlayerName = getParameterByName('playerName');
    var roomToJoin = getParameterByName('roomToJoin');

    //Properties
    var fayeUrl = getCurrentUrl() + 'faye';
    var currentPlayerScore = 0;
    var otherPlayersName = "";
    var correctAnswerWorth = 5;
    var incorrectAnswerWorth = -3;
    var maxRounds = 7;
    var answerOptions = 4;
    var currentRound = 0;    
    var movieData = [];
    var gameRules = {};
    
    var client = new Faye.Client(fayeUrl);
    
    $.get('/getRules', function (rules) {
        gameRules = rules;
        
        correctAnswerWorth = gameRules.CorrectAnswerWorth;
        incorrectAnswerWorth = gameRules.IncorrectAnswerWorth;
        maxRounds = gameRules.MaxRounds;

        if (currentPlayerName !== "") {
            $PlayerName.val(currentPlayerName);
        }
        
        $WaitingMessage.slideUp();
        $lblTotalRounds.text(maxRounds);
        
        //Connect to the Faye Pub/Sub server.        
        client.connect();
        
        displayNewPlayer();
    });       
    
    function displayNewPlayer() {
        if (currentPlayerName === "") {
            $Welcome.slideUp();
            var $btnCreatePlayer = $("#btnCreatePlayer");
            $Player.slideDown();
            
            $(document).keypress(function (e) {
                if (e.which === 13) {
                    createPlayer();
                    return false;
                }
            });
            
            $btnCreatePlayer.click(function () {
                createPlayer();
            });
        } else {
            createPlayer();
        }
        
        function createPlayer() {
            $(document).unbind();
            currentPlayerName = $PlayerName.val();
            if (currentPlayerName === "") {
                displayNotification("Please ensure that you enter your name before clicking the Sign in button.", "warn");
                return false;
            }

            setUrl();
            $Player.slideUp();
            
            $lblPlayerName.text(currentPlayerName);
            $.get('/createPlayer?playerName=' + currentPlayerName, function (newPlayer) {
                currentPlayer = newPlayer;
                $Welcome.slideDown();
                
                if (roomToJoin != "") {
                    joinRoom(roomToJoin);
                } else {
                    displayAvailableRooms();
                }
            });
            
            return true;
        }
    }
    
    function displayAvailableRooms() {
        $.get('/getAvailableRooms?currentPlayer='+ currentPlayerName, function (data) {
            if (data.length === 0) {
                $CurrentRooms.slideUp();
                
                //Create a subscriber to let the other players know that new rooms has been created
                client.subscribe('/newRoomAlert', function (message) {
                    client.unsubscribe('/newRoomAlert');
                    displayAvailableRooms();
                });

                return;
            }
            var result = '<ul class="list-group">';
            
            for (var i = 0; i < data.length; i++) {
                var roomUrl = getCurrentUrl() + "?roomToJoin=" + data[i].RoomName +"&playerName="+ currentPlayerName;

                result += "<li class='list-group-item'>" + data[i].RoomName + " - Round "+ (data[i].CurrentRound + 1) +" (" + data[i].Players.length + " player(s) - "+ roomUrl +") <a href='" + roomUrl + "' data-roomName='" + data[i].RoomName + "' class='joinRoom'>Join</a></li>";
            }
            
            result += "</ul>";
            
            $CurrentRoomsHolder.html(result);
            $CurrentRoomsHolder.slideDown();
            $CurrentRooms.slideDown();
            
            $(".joinRoom").click(function () {
                var selectedRoomName = $(this).attr('data-roomName');
                joinRoom(selectedRoomName);
            });
        });
    }
    
    $btnCreateNewGame.click(function () {
        $.get('/createRoom?roomName=' + makeid() + "&playerName=" + currentPlayerName, function (data) {
            client.publish('/newRoomAlert', true);
            enterRoom(data);
        });
    });
    
    function joinRoom(nameOfRoomToJoin) {
        $.get('/joinRoom?roomName=' + nameOfRoomToJoin + "&playerName=" + currentPlayerName, function (data) {
            enterRoom(data);
        });
    }
    
    function getOpponentName(data) {    
        var playersInRoom = data.Players;
        
        for (var i = 0; i < playersInRoom.length; i++) {
            if (currentPlayerName !== playersInRoom[i].PlayerName) {
                otherPlayersName = playersInRoom[i].PlayerName;
                $lblOpponentNameHeading.text(otherPlayersName + "'s score:");
                $lblOpponentName.text(otherPlayersName);
                break;
            }
        }
    }
    
    function setUrl() {
        require(['jquery', 'jquery-history'], function ($) {
            // Bind to StateChange Event
            History.Adapter.bind(window, 'statechange', function () {
                History.getState();
            });
            
            if (roomToJoin === "") {
                //Record the Room Name if we refresh
                History.pushState({ roomName: currentRoomName }, "Playing in room " + currentRoomName + " - Movie Night", "?roomToJoin=" + currentRoomName +"&playerName="+ currentPlayerName);
            }
        });
    }
    
    function enterRoom(data) {
        currentRoomName = data.RoomName;
        currentRound = data.CurrentRound;
        currentRoom = data;

        getOpponentName(data);        
        $Welcome.slideUp();
        $NoOpponent.slideUp();

        movieData = data.MovieData;
        setUrl();
        
        $lblPlayerNameHeading.text(currentPlayerName);
        $ScoresHolder.slideDown();
        
        if (otherPlayersName == "") {
            noOpponentHandler();
            return;
        } else {
            //Let the other players in the room know that you are ready.
            client.publish('/joinRoom' + currentRoomName, currentPlayer);
        }
        
        //Create a subscription for the players to talk to each other.
        createSubscriber('room' + data.RoomName + '-' + currentPlayerName);
        loadQuestion();
    }
    
    function noOpponentHandler() {
        $ScoresHolder.slideUp();
        $Questions.slideUp();
        $NoOpponent.slideDown();
        
        $RoomUrl.text(getCurrentUrl() +"?roomToJoin="+ currentRoomName);
        
        //Create a channel for other players to join the room.
        client.subscribe('/joinRoom' + currentRoomName, function (opponent) {
            currentRoom.Players.push(opponent);
            displayNotification("Awesome " + opponent.PlayerName + " is ready to battle! Don your pants of smartness!", "success");
            getOpponentName(currentRoom);
            $NoOpponent.slideUp();
            
            createSubscriber('room' + currentRoomName + '-' + currentPlayerName);
            $ScoresHolder.slideDown();

            loadQuestion();
        });
    }
    
    function loadQuestion() {
        playerHasGone = false;
        $Questions.slideUp();
        $QuestionsHolder.html("");
        opponentHasGone = false;
        displayQuestion(movieData[currentRound]);
        $Questions.slideDown();

        $lblCurrentRound.text(currentRound + 1);
        
        $(".answer").click(function () {
            playerHasGone = true;
            $(".answerOptions").fadeTo("slow" , 0.5, function () {
                $(this).find("input").attr("disabled", "disabled");
            });
            
            var isAnswer = $(this).attr('data-isAnswer');
            
            if (isAnswer == "true") {
                updatePlayerScore(correctAnswerWorth);
            } else {
                updatePlayerScore(incorrectAnswerWorth);
            }
            
            if (currentRound === maxRounds - 1) {
                if (opponentHasGone) {
                    alertOtherPlayerThatIsTheirTurn();
                    showResults();
                } else {
                    alertOtherPlayerThatIsTheirTurn();
                }           
            } else {
                alertOtherPlayerThatIsTheirTurn();
            }
        });
    }
    
    //Find the player index in this room for update.
    function returnCurrentPlayerIndexInRoom(playersArray) {
        var res = 0;

        for (var i = 0; i < playersArray.length; i++) {
            if (playersArray[i].PlayerName == currentPlayerName) {
                res = i;
                break;
            }
        }

        return res;
    }
        
    //Publish message to other plakyer
    function alertOtherPlayerThatIsTheirTurn() {
        var roomState = {
            "PlayerName" : currentPlayerName,
            "CurrentRound": currentRound,
            "OpponentScore" : currentPlayerScore
        }
        
        client.publish('/room' + currentRoomName + '-' + otherPlayersName, roomState);
        if (!opponentHasGone) {
            displayNotification("Shot " + currentPlayerName + ", we are just waiting for " + otherPlayersName + " to have their turn.", "success");
            $WaitingMessage.slideDown();
        } else {
            moveToNextRound();
            loadQuestion();
        }
    }

    var opponentHasGone = false;
    var playerHasGone = false;
    
    //Function to handle the other playing have a turn.
    function createSubscriber(subscriberChannelName) {
        client.subscribe('/' + subscriberChannelName, function(message) {
            $WaitingMessage.slideUp();
            opponentHasGone = true;
            $lblYourOponentsScore.text(message.OpponentScore);

            if (playerHasGone) {
                if (currentRound === maxRounds - 1) {
                    showResults();
                } else {
                    displayNotification("Awesome " + otherPlayersName + " has just gone, loading the next question.", "success");
                    moveToNextRound();
                    loadQuestion();
                }                
            } else {
                displayNotification("Awesome " + otherPlayersName + " has just gone, it's your turn now " + currentPlayerName + ".", "success");
            }
        });
    }
    
    function moveToNextRound()
    {
        currentRound += 1;
        currentPlayer.CurrentScore = currentPlayerScore;
        var currentPlayerRoomIndex = returnCurrentPlayerIndexInRoom(currentRoom.Players);
        currentRoom.Players[currentPlayerRoomIndex] = currentPlayer;
        currentRoom.CurrentRound = currentRound;
    }
    
    function showResults() {
        $Questions.slideUp();
        $Results.slideDown();

        var opponentScore = parseInt($lblYourOponentsScore.text());
        currentPlayerScore = parseInt($lblYourScore.text());

        var msgResponse = "Well done you have won!";
        
        if (opponentScore > currentPlayerScore) {
            //You Lose
            msgResponse = "You lost, sorry. Why not try another game?";
        } else if (opponentScore == currentPlayerScore) {
            //You Drew
            msgResponse = "Looks like you guys drew. That's not very exciting is it? Why don't you have another go?";
        } 
        
        $ResultsHolder.html(msgResponse);

        $("#aReturn").attr('href', "/?playerName=" + currentPlayerName);
    }
    
    function updatePlayerScore(amountToAdd) {
        currentPlayerScore += amountToAdd;
        currentPlayer.CurrentScore = currentPlayerScore;        
        $lblYourScore.text(currentPlayerScore);
    }
    
    function displayQuestion(questionData) {
        var result = $QuestionsHolder.html();
        
        result += "<div class='row'>";
        
        result += '<div class="col-md-4">';
        result += "<img src='" + questionData.imgUrl + "' alt='" + questionData.title + "'  title='" + questionData.title + "' />";
        result += "</div>";
        
        var answerArray = [];
        answerArray.push("<input type='radio' name='questions' class='answer' data-isAnswer='true' value='" + questionData.release + "'>" + questionData.release); //The correct answer;
        
        var incorrectAnswer = 0;
        
        for (var i = 0; i <= answerOptions; i++) {
            incorrectAnswer = parseInt(questionData.release) + Math.floor(Math.random() * -10) + 1;
            answerArray.push("<input type='radio' name='questions' data-isAnswer='false' class='answer'>" + incorrectAnswer);
        }
        
        function shuffle(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        }
        
        answerArray = shuffle(answerArray);
        result += '<div class="col-md-8">';
        result += "<h3>" + questionData.title + "</h3>";
        result += "<h4>IMDB rank " + questionData.rank + "</h4>";
        result += '<div class="answerOptions">';
        result += answerArray.toString().replace(new RegExp(',', 'g'), '<br/>');
        result += "</div>";
        result += "</div>";
        result += "</div>";
        
        $QuestionsHolder.html(result);
    }
    
    //General Utilities
    function displayNotification(msg,msgType) {
        require(['jquery', 'notify'], function ($) {
            $.notify(msg, msgType);
        });
    }
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        
        for (var i = 0; i < 5; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        
        return text;
    }
    function getCurrentUrl() {
        return location.protocol + '//' + location.host + location.pathname;
    }
});