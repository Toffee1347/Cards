var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
const Deck = require('./deck.js')
let games = {abc:undefined}
const socket_commands = [
    ['ctaCreate', (body, emit, token) => {
        createCtaGame((gameId) => {
            emit('gameMade', {gameId:gameId})
        })
    }],
    ['ctaJoin', async (body, emit, token) => {
        if (body.gameId in games == false) {
            return emit('inncorrect', null)
        }
        switch (games[body.gameId].status) {
            case 0:
                games[body.gameId].status = 1
                games[body.gameId].players.push({
                    token: token,
                    emit: emit,
                    username:body.username,
                    lives: 3
                })
                games[body.gameId].playerCount++
                emit('ctaPlayerCount', players(games[body.gameId].players))
                emit('ctaPlayerOne', null)
                emit('ctaSucsess', null)
            break;
            case 1:
                if (games[body.gameId].playerCount == 51) {
                    return emit('inncorrect', null)
                }
                games[body.gameId].players.push({
                    token: token,
                    emit: emit,
                    username:body.username,
                    lives: 3
                })
                games[body.gameId].playerCount++
                games[body.gameId].players[0].emit('ctaPlayerCount', players(games[body.gameId].players))
                if (games[body.gameId].playerCount >= 4) {
                    games[body.gameId].players[0].emit('ctaButtonStatus', false)
                }
                emit('ctaSucsess', null)
            break;
            case 2:
                emit('inncorrect', null)
            break;
        }
    }],
    ['ctaStart', async (body, emit, token) => {
        if (games[body].playerCount < 4 || games[body].players[0].token != token || games[body].status != 1) return
        games[body].status = 2
        let cards = await games[body].deck.draw(games[body].playerCount)
        for (let i in games[body].players) {
            games[body].players[i].card = cards[i]
            games[body].players[i].emit('start', {count:games[body].playerCount, player:i, players:players(games[body].players), lives:lives(games[body].players)})
            games[body].players[i].emit('setCard', {card:cards[i], lives: games[body].players[i].lives})
        }
        for (let i in games[body].players) {
            if (games[body].players[i].card.value == 'KING') {
                games[body].emit('setPlayerCard', {player:i, card:games[body].players[i].card, lives:games[body].players[i].lives})
            }
        }
        for (let i in games[body].players) {
            if (games[body].players[i].card.value != 'KING' && games[body].players[parseInt(i)+1].card.value != 'KING') {
                games[body].playersGo = i
                games[body].emit('playersGo', {player:games[body].playersGo})
                break;
            }
        }
        }],
    ['ctaKick', (body, emit, token) => {
        if (games[body.gameId].players[0].token != token) return
        if (body.player == 0) return
        let newList = []
        games[body.gameId].players[body.player].emit('ctaClientKicked', null)
        for (let player in games[body.gameId].players) {
            if (player != body.player) {
                newList.push(games[body.gameId].players[player])
            }
        }
        games[body.gameId].players = newList
        games[body.gameId].playerCount--
        emit('ctaPlayerCount', players(games[body.gameId].players))
        if (games[body.gameId].playerCount < 4) {
            emit('ctaButtonStatus', true)
        }
    }],
    ['ctaDissconnect', (body, emit, token) => {
        let playerNum
        for (let i in games[body].players) {
            if (games[body].players[i].token == token) {
                playerNum = i
            }
        }
        let newList
        for (let player in games[body].players) {
            if (player != playerNum) {
                newList.push(games[body].players[player])
            }
        }
        games[body.gameId].players = newList
        games[body.gameId].playerCount--
        emit('ctaPlayerCount', players(games[body.gameId].players))
        if (games[body.gameId].playerCount < 4) {
            emit('ctaButtonStatus', true)
        }
    }],
    ['ctastick', (body, emit, token) => {
        for (let i in games[body.gameId].players) {
            if (games[body.gameId].players[i].token == token && games[body.gameId].playersGo == i) {
                games[body.gameId].emit('finPlayersGo', {player: i})
                games[body.gameId].playersGo++
                for (let i = games[body.gameId].playersGo; i <= games[body.gameId].players.length; i++) {
                    if (games[body.gameId].players.length <= i) {
                        ctaFinishRound(body.gameId)
                        break;
                    }
                    else if (i == games[body.gameId].players.length - 1) {
                        if (games[body.gameId].players[i].card.value != 'KING') {
                            games[body.gameId].playersGo = i
                            games[body.gameId].emit('playersGo', {player:games[body.gameId].playersGo})
                        }
                        else {
                            ctaFinishRound(body.gameId)
                        }
                        break;
                    }
                    else if (games[body.gameId].players[i].card.value != 'KING' && games[body.gameId].players[parseInt(i)+1].card.value != 'KING') {
                        games[body.gameId].playersGo = i
                        games[body.gameId].emit('playersGo', {player:games[body.gameId].playersGo})
                        break;
                    }
                }
            break;
            }
        }
    }],
    ['ctaswap', async (body, emit, token) => {
        for (let i in games[body.gameId].players) {
            if (games[body.gameId].players[i].token == token && games[body.gameId].playersGo == i) {
                if (i == games[body.gameId].players.length - 1) {
                    let cards = await games[body.gameId].deck.draw()
                    games[body.gameId].players[i].card = cards[0]
                    if (games[body.gameId].players[i].card.value == 'KING') {
                        games[body.gameId].emit('setPlayerCard', {player:i, card:games[body.gameId].players[i].card, lives:games[body.gameId].players[i].lives})
                    }
                    games[body.gameId].players[i].emit('setCard', {card:games[body.gameId].players[i].card, lives:games[body.gameId].players[i].lives})
                    games[body.gameId].emit('finPlayersGo', {player: i})
                    ctaFinishRound(body.gameId)
                }
                else {
                    const player1 = parseInt(i)
                    const player2 = parseInt(i)+1
                    let cards = [games[body.gameId].players[player1].card, games[body.gameId].players[player2].card]
                    games[body.gameId].players[player1].card = cards[1]
                    games[body.gameId].players[player2].card = cards[0]
                    games[body.gameId].players[player1].emit('setCard', {card:cards[1], lives:games[body.gameId].players[player1].lives})
                    games[body.gameId].players[player2].emit('setCard', {card:cards[0], lives:games[body.gameId].players[player2].lives})
                    games[body.gameId].emit('finPlayersGo', {player: i})
                    games[body.gameId].playersGo++
                    for (let i = games[body.gameId].playersGo; i <= games[body.gameId].players.length; i++) {
                        if (games[body.gameId].players.length <= i) {
                            ctaFinishRound(body.gameId)
                            break;
                        }
                        else if (i == games[body.gameId].players.length - 1) {
                            if (games[body.gameId].players[i].card.value != 'KING') {
                                games[body.gameId].playersGo = i
                                games[body.gameId].emit('playersGo', {player:games[body.gameId].playersGo})
                            }
                            else {
                                ctaFinishRound(body.gameId)
                            }
                            break;
                        }
                        else if (games[body.gameId].players[i].card.value != 'KING' && games[body.gameId].players[parseInt(i)+1].card.value != 'KING') {
                            games[body.gameId].playersGo = i
                            games[body.gameId].emit('playersGo', {player:games[body.gameId].playersGo})
                            break;
                        }
                    }
                }
            break;
            }
        }
    }],
    ['ping', (body, emit, token) => {
        emit('pingRes', Date.now() - body)
    }]
]

const ctaFinishRound = async (id) => {
    for (let i in games[id].players) {
        if (!Number.isInteger(parseInt(games[id].players[i].card.value))) {
            if (games[id].players[i].card.value == 'ACE') {
                games[id].players[i].card.value = 0
            }
            else if (games[id].players[i].card.value == 'JACK') {
                games[id].players[i].card.value = 11
            }
            else if (games[id].players[i].card.value == 'QUEEN') {
                games[id].players[i].card.value = 12
            }
            else if (games[id].players[i].card.value == 'KING') {
                games[id].players[i].card.value = 13
            }
        }
    }
    let values = []
    for (let i in games[id].players) {
        values.push(games[id].players[i].card.value)
    }
    let min = Math.min(...values)
    for (let i in games[id].players) {
        if (games[id].players[i].card.value == min) {
            games[id].players[i].lives--
            if (games[id].players[i].lives == 0) {
                games[id].players[i].alive = false
            }
        }
        games[id].emit('setPlayerCard', {player:i, card:games[id].players[i].card, lives:games[id].players[i].lives})
    }


    setTimeout(async () => {
        let cards = await games[id].deck.draw(games[id].playerCount)
        for (let i in games[id].players) {
            games[id].players[i].card = cards[i]
            games[id].players[i].emit('start', {count:games[id].playerCount, player:i, players:players(games[id].players), lives:lives(games[id].players)})
            games[id].players[i].emit('setCard', {card:cards[i], lives:games[id].players[i].lives})
        }
        for (let i in games[id].players) {
            if (games[id].players[i].card.value == 'KING') {
                games[id].emit('setPlayerCard', {player:i, card:games[id].players[i].card, lives:games[id].players[i].lives})
            }
        }
        for (let i in games[id].players) {
            if (games[id].players[i].card.value != 'KING' && games[id].players[parseInt(i)+1].card.value != 'KING') {
                games[id].playersGo = i
                games[id].emit('playersGo', {player:games[id].playersGo})
                break;
            }
        }
    }, 5000)
}

app.all('*', (req, res) => {
    let file
    let readFile = true
    let url = req.url
    if (url.includes('.')) {
        file = './public' + url
    }
    else if (url.includes('start')) {
        readFile = false
        if (url.includes('cta')) {
            createCtaGame((gameId) => {
                res.redirect(`/join#cta#${gameId}`)
            })
        }
        else {
            res.redirect('/')
        }
    }
    else {
        file = './public' + url + '/index.html'
    }
    if (readFile) {
        fs.readFile(file, 'utf8', function(error, data) {
            if (error) {
                res.statusCode = 404
                res.redirect('/')
            }
            else {
                res.statusCode = 200
                res.sendFile(__dirname + String(file).replace('.', ''))
            }
        })
    }
    read_file = true
  });


const PORT = process.env.PORT || 80;
http.listen(PORT, () => {
    console.log(`App is running on port ${PORT}`);
});

io.on('connection', (socket) => {
    socket.on('add_user', (data) => {
        for (const x of socket_commands) {
            socket.on(data.token + x[0], (data) => {
                try {
                    x[1](data.body, (socket_event, func_data) => {
                        socket.emit(data.token + socket_event, {body:func_data, token:data.token})
                    }, data.token)
                }
                catch(err) {
                    socket.emit(data.token + 'error', {body:{name:err.name, message:err.message}, token:data.token})
                    console.error(err)
                }
            })
        }
    })
    socket.on('reconnect_user', (data) => {
        for (const x of socket_commands) {
            socket.on(data.token + x[0], (data) => {
                try {
                    x[1](data.body, (socket_event, func_data) => {
                        socket.emit(data.token + socket_event, {body:func_data, token:data.token})
                    }, data.token)
                }
                catch(err) {
                    socket.emit(data.token + 'error', {body:{name:err.name, message:err.message}, token:data.token})
                    console.error(err)
                }
            })
        }
    })
})

function createCtaGame(onMake) {
    let gameId = 'abc'
    while (gameId in games) {
        gameId = makeId()
    }
    games[gameId] = {
        playerCount: 0,
        game:'cta',
        status: 0,
        players: [],
        dead: [],
        deck: new Deck(() => {onMake(gameId)}),
        emit: (name, body) => {
            for (const player of games[gameId].players) {
                player.emit(name, body)
            }
        }
    }
}

function players(playersList) {
    let newPlayersList = []
    for (const player of playersList) {
        if (player != null) {
            newPlayersList.push(player.username)
        }
    }
    return newPlayersList
}

function lives(list) {
    let newLivesList = []
    for (const player of list) {
        if (player != null) {
            newLivesList.push(player.lives)
        }
    }
    return newLivesList
}

function makeId(length=5) {
    var result = ''
    for (var i = 0; i < length; i++) {
       result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 52))
    }
    return result
}