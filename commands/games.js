let Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    low = require('lowdb'),
    FileSync = require('lowdb/adapters/FileSync'),
    db = low(new FileSync('jsons/battleship.json')),
    Module = new Augur.Module();

//The generateBoard function below is a slightly modified version of Alden Bradford's, which you can find here: https://www.math.purdue.edu/~bradfoa/personal_projects/battleship/. All credit to Alden Bradford.
function generateBoard(){
    function parseShips(string){
    let inputList = string.match(/\w,\d+/g);
    let ships = [];
    for(let i = 0; i < inputList.length; i++){
        let pair = [];
        pair[0] = inputList[i].match(/\w/)[0];
        pair[1] = parseInt(inputList[i].match(/\d+/)[0],10);
        ships[i] = pair;
    }
    return ships;
    }
    class Board {
    constructor(form){
        this.rows = 10;
        this.cols = 10;
        this.cells = [];
        this.initializeCells();
        this.shipPairs = parseShips('(a,2),(b,3),(c,3),(d,4),(e,5)');
        this.failed = false;
    }
    initializeCells(){
        this.cells = [];
        for(let i=0;i<this.cols;i++){
        this.cells[i]=[];
        for(let j=0;j<this.rows;j++){
            this.cells[i][j]= new Cell();
        }
        }
    }
    appearance(){
        let string = 
        "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i j k l m n o p q r s t u v w x y z";
        string = string.slice(0,this.cols*2+2);
        string = string.concat('\n');
        for(let j = 0; j < this.rows; j++){
        if( j < 9)  string = string.concat('');
        string = string.concat(`${j+1}`);
        for(let i = 0; i < this.cols; i++){
            string = string.concat(" "+this.cells[i][j].appearance());
        }
        string = string.concat('\n');
        }
        string = string.slice(0,-1);
        return string;
    }
    placeShip(charLenPair){
        let direction = ["v","h"][Math.floor(Math.random()*2)];
        let max_col = this.cols;
        let max_row = this.rows;
        if(direction === "v") max_row -= (charLenPair[1]-1);
        if(direction === "h") max_col -= (charLenPair[1]-1);
        if(max_row <1 || max_col<1) return false;
        let corner=[Math.floor(Math.random()*max_col),
            Math.floor(Math.random()*max_row)];
        let newShip = new Ship(charLenPair,direction,corner,this);
        if(newShip.canFit()){
        newShip.insert();
        return true;
        } else {
        return false;
        }
    }
    placeShips(){
        for(let attempt = 0; attempt < 1000000; attempt++){
        this.initializeCells();
        let attemptSuccessful = true;
        for(let i = 0; i<this.shipPairs.length; i++){
            if(!this.placeShip(this.shipPairs[i])){
            attemptSuccessful = false;
            break;
            }
        }
        if(attemptSuccessful){
            return;
        }
        }
        this.failed = true;
    }
    }
    class Ship{
    constructor(charLenPair,orientation,corner,board){
        this.appearance = charLenPair[0];
        this.length = charLenPair[1];
        this.orientation = orientation;
        this.corner = corner;
        this.board = board;
    }
    cells(){
        let cellList = [];
        if(this.orientation === "h"){
        for(let i = 0; i < this.length; i++){
            cellList[i] = this.board.cells[this.corner[0]+i][this.corner[1]  ];
        }
        }
        if(this.orientation === "v"){
        for(let i = 0; i < this.length; i++){
            cellList[i] = this.board.cells[this.corner[0]  ][this.corner[1]+i];
        }
        }
        return cellList;
    }
    canFit(){
        let cellList = this.cells();
        for(let i = 0; i<this.length; i++){
        if(cellList[i].contains) return false;
        }
        return true;
    }
    insert(){
        let cellList=this.cells();
        for(let i = 0; i<this.length; i++){
        cellList[i].contains = this;
        }	
    }
    }
    class Cell {
    constructor(){
    this.contains = null;
    }
    appearance(){
        return this.contains ? this.contains.appearance : '~';
    }
    }
    let board = new Board();
    board.placeShips();
    if (board.failed) return null
    return board.appearance().replace(/[^a-e~\n]/g, '').replace(/~/g, '0').split('\n').splice(1)
}
Module.addCommand({name: "playing",
    onlyGuild: true,
    category: "Games",
    process: async(msg, suffix)=>{
        function currentPlayers(game){
            // List people playing the game
            let players = [];
            let games = []
            try{
                for(m of msg.guild.members.cache.map(m=>m)){
                    if (m.user.bot) continue
                    let presence = m.user.presence.activities.filter(a => a.type == "PLAYING" && a.name.toLowerCase().startsWith(game.toLowerCase()))[0]
                    if(presence){
                        players.push(`• <@${m.id}>`)
                        games.push(presence.name)
                    }
                }
                if(games[0]) game = games[0]
                let embed = u.embed().setTitle(`${msg.guild.name} members currently playing ${game}`).setTimestamp()
                players.sort((a, b) => a.localeCompare(b))
                if (players.length > 0) embed.setDescription(players.join("\n"))
                else embed.setDescription(`I couldn't find any members playing ${game}.`)
                return embed
            } catch (error) {u.errorHandler(error, 'Playing currentPlayers Function')}
        }
        if (suffix) msg.channel.send({embed: currentPlayers(suffix), disableMentions: 'all'})
        else{
            // List *all* games played
            let games = new u.Collection()
            for (m of msg.guild.members.cache.map(m=>m)){
                if (m.user.bot) continue
                let game = m.user.presence.activities.filter(a => a.type == "PLAYING")[0]
                if (game && !games.has(game.name)) games.set(game.name, {game: game.name, players: 0, people: m})
                if(game){
                    games.get(game.name).players++
                    games.get(game.name).people+(m)
                }
            }
            let gameList = games.sort((a, b) => {
                if (b.players == a.players) return a.game.localeCompare(b.game)
                else return b.players - a.players
            }).array()
            let min = Math.min(gameList.length, 25)
            let embed = u.embed().setTimestamp()
                .setTitle("Currently played games in " + msg.guild.name)
                .setDescription(`The ${min == 1 ? 'only game' : 'top '+min+' games'} game${ min == 1 ? '':'s'} currently being played in ${msg.guild.name}:`)
                
            if (gameList.length > 0)  for (let i = 0; i < Math.min(gameList.length, 25); i++) embed.addField(gameList[i].game, gameList[i].people, gameList[i].people, true)
            else embed.setDescription("Well, this is awkward... Nobody is playing anything.")
            msg.channel.send({embed, disableMentions: "all"})
        }
    }
})
.addCommand({name: "battleship",
    aliases: ['b'],
    category: "Games",
    process: async(msg, args) =>{
        //0 - Nothing 🟦
        //1 - Ship ⬜
        //2 - Ship Hit 💥
        //3 - Miss 🟥
        db.defaults({ Games: []}).write()
        function replace(board){
            let prefixes = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'],
                final = [],
                i = 0
            for(let x of board.split('\n')) {final.push(`${prefixes[i]} ${x.split('').join(' ').replace(/0/g, '🟦').replace(/[a-e]/g, '⬜').replace(/2/g, '💥').replace(/3/g, '🟥')}`);i++}
            final.push('🆚 🇦 🇧 🇨 🇩 🇪 🇫 🇬 🇭 🇮 🇯')
            return final.join('\n')
        }
        let findEntry = db.get("Games").find({p1: msg.author.id})
        if(db.get("Games").find({p2: msg.author.id}).get('p2').value()) findEntry = db.get("Games").find({p2: msg.author.id})
        if(!findEntry.get("p1").value()){
            let player1 = msg.author,
                player2 = msg.mentions.users.first()
            if(!player2) return msg.channel.send("Who do you want to play against?")
            if(player1.id == player2.id) return msg.channel.send("You can't play against yourself, silly!")
            if(player2.bot) return msg.channel.send("You can't play against a bot. They're too good at the game")
            if(findEntry.get('p1').value() == player2.id || findEntry.get('p2').value() == player2.id) return msg.channel.send("That person is already in a game.")
            
            msg.channel.send("Starting game...")
            player1.send(`Game request sent to ${player2.username}. Waiting for their confirmation`)
            let askEmbed = u.embed().setTitle(`Battleship Request from ${player1.username}`).setDescription(`${player1.username} has requested to play a game of battleship with you. Please confirm or deny their request`),
                confirmEmbed = u.embed().setTitle('Confirmation recieved').setDescription('Starting the game...'),
                cancelEmbed = u.embed().setTitle('Cancelation recieved').setDescription(`Letting ${player1.username} know.`),
                confirm = await u.confirmEmbed(player2, askEmbed, confirmEmbed, cancelEmbed);
            if(confirm == true){
                db.get("Games").push({
                    p1: player1.id,
                    p2: player2.id,
                    p1Rows: generateBoard(),
                    p2Rows: generateBoard(),
                    turn: Math.floor(Math.random() * 2)+1,
                }).write();
                let p1embed1 = u.embed().setTitle(`Your Board`).setDescription(replace((await findEntry.get('p1Rows').value()).join('\n'))).setFooter("To send a torpedo, do !b <tile>. For example, !b a1"),
                    p2embed1 = u.embed().setTitle(`Your Board`).setDescription(replace((await findEntry.get('p2Rows').value()).join('\n'))).setFooter("To send a torpedo, do !b <tile>. For example, !b a1"),
                    p1embed2 = u.embed().setTitle(`${player2.username}'s Board`).setDescription(replace(await findEntry.get('p2Rows').value().join('\n').replace(/[a-e]/g, '0'))),
                    p2embed2 = u.embed().setTitle(`${player1.username}'s Board`).setDescription(replace(await findEntry.get('p1Rows').value().join('\n').replace(/[a-e]/g, '0')))

                player1.send(`It's ${findEntry.get('turn').value() == '1' ? 'your' : player2.username+'\'s' } turn`,{embed: p1embed1})
                player1.send({embed: p1embed2})
                player2.send(`It's ${findEntry.get('turn').value() == '2' ? 'your' : player1.username+'\'s' } turn`,{embed: p2embed1})
                return player2.send({embed: p2embed2})
            }
            else if(confirm == false) return player1.send(`${player1.username} didn't want to play.`)
            else return player1.send(`The request was canceled because ${player2.username} didn't respond in time!`)
        }
        else{
            let test = /([a-j])(10|[1-9])/g.exec(args.toLowerCase().replace(' ', '')),
                x = test ? test[1] : '',
                y = test ? test[2] : '',
                xes = ['a','b','c','d','e','f','g','h','i','j'],
                sendP1 = msg.client.users.cache.get(findEntry.get("p1").value()),
                sendP2 = msg.client.users.cache.get(findEntry.get("p2").value()),
                turn = findEntry.get('turn').value(),
                sendTo = (turn == '1' ? sendP1 : sendP2),
                sendToOpp = (turn == '1' ? sendP2 : sendP1);
            if(xes.includes(x) && 0 < Math.round(y) < 11){
                if((sendP1.id == msg.author.id && turn == '2') || (sendP2 == msg.author.id && turn == '1')) return msg.author.send("It's not your turn!")
                let pos = xes.indexOf(x),
                    row = findEntry.get(turn == 1 ? 'p2Rows' : 'p1Rows').value()[y-1],
                    letterArray = ['a','b','c','d','e']
                    hit = letterArray.includes(row.charAt(pos)) ? row.charAt(pos) : false
                if(['2','3'].includes(row.charAt(pos))) return sendTo.send("You already hit that spot!").then(u.clean)
                let findRows = findEntry.get(turn == '1' ? 'p2Rows' : 'p1Rows')
                try{

                    let str = findRows.get(y-1).value()
                    findRows.assign({[y-1]: str.substr(0, pos)+`${hit ? '2' : '3'}`+str.substr(pos+1)}).write()

                    if(!findRows.value().join('\n').replace(/[^a-e]/g, '')){
                        let r1 = replace(findEntry.get(turn == '1' ? 'p1Rows' : 'p2Rows').value().join('\n')),
                            r2 = replace(findRows.value().join('\n')),
                            embed1 = u.embed().setTitle(`Final Boards`).setDescription(`Your Board:\n${r1}`),
                            embed2 = u.embed().setDescription(`${sendToOpp.username}'s board:\n${r2}`),
                            embed3 = u.embed().setTitle(`Final Boards`).setDescription(`Your Board:\n${r1}`),
                            embed4 = u.embed().setDescription(`${sendTo.username}'s board:\n${r2}`)
                        sendTo.send({content: 'You won!', embed: embed1});
                        sendTo.send({embed: embed2})
                        sendToOpp.send({content: `${sendTo.username} won! Better luck nex time.`, embed: embed3});
                        sendToOpp.send({embed: embed4})
                        return db.get('Games').remove(findEntry.get('p1').value() == msg.author.id ? {p1: msg.author.id} : {p2: msg.author.id}).write()
                    }
                }
                catch (e) {u.errorHandler(e, 'Battleship db write error')}

                let newTrackEmbed = u.embed().setTitle(`${turn == '1' ? sendP2.username : sendP1.username}'s board`).setDescription(replace(findEntry.get(turn == '1' ? 'p2Rows' : 'p1Rows').value().join('\n').replace(/[a-e]/g, '0'))),
                    otherPEmbed = u.embed().setTitle(`Your board`).setDescription(replace(findRows.value().join('\n'))),
                    sunk
                if(hit && !(findEntry.get(turn == 1 ?'p2Rows' : 'p1Rows').value()).join('').split('').includes(hit)) sunk = ['Patrol Boat','Submarine','Destroyer','Battleship','Carrier'][letterArray.indexOf(hit)]
                sendTo.send((hit ? `Hit! 💥 ${sunk ? `You sunk their ${sunk}!` : ''}` : 'Miss!'),{embed: newTrackEmbed})
                sendToOpp.send((`${x.toUpperCase()}${y}... ${hit ? `Hit!💥 ${sunk ? `Your ${sunk} was destroyed!` : ''}` : 'Miss!'}`),{embed: otherPEmbed})
                return findEntry.assign({turn: turn == '1' ? '2' : '1'}).write()
            }
            else if(args.toLowerCase() == 'quit'){
                let toQuitter = (msg.author.id == sendP1.id ? sendP1 : sendP2),
                    toQuitted = (msg.author.id == sendP1.id ? sendP2 : sendP1)
                toQuitter.send("You forfeited the match. GG!")
                toQuitted.send(`${toQuitter.username} forfeited the match. GG!`)
                db.get('Games').remove(findEntry.get('p1').value() == msg.author.id ? {p1: msg.author.id} : {p2: msg.author.id}).write()
            }
            else if(args.toLowerCase() == 'remind') sendToOpp.send(`${msg.author.username} wanted to remind you that it's your turn!`)
            else return msg.author.send("That's not the right format! Try something like !battleship b9")
        }
    }
})
.addCommand({name:"tictactoe",
    aliases: ['t'],
    process: async(msg, suffix) =>{
        db = low(new FileSync('jsons/tictactoe.json'))
        db.defaults({Games: []}).write()
        let findEntry = db.get('Games').find({'p1': msg.author.id})
        if(db.get('Games').find({'p2': msg.author.id}).get('p2').value()) findEntry = db.get('Games').find({'p2': msg.author.id})
        async function replace(board){
            return board.join('\n').replace(/0/g, '🟦').replace(/x/g, '🇽').replace(/o/g, '🇴')
        }
        if(!findEntry.get('p1').value()){
            let player1 = msg.author,
                player2 = msg.mentions.users.first()

            if(!player2) return msg.channel.send("Who do you want to play against?")
            if(player1.id == player2.id) return msg.channel.send("You can't play against yourself, silly!")
            if(player2.bot) return msg.channel.send("You can't play against a bot. They're too good at the game")
            if(findEntry.get('p1').value() == player2.id || findEntry.get('p2').value() == player2.id) return msg.channel.send("That person is already in a game.")
            
            msg.channel.send("Starting game...")
            player1.send(`Game request sent to ${player2.username}. Waiting for their confirmation`)
            let promptEmbed = u.embed().setTitle('Tic Tac Toe Request').setDescription(`${player1.username} has requested to play a game of tic tak toe with you. Please confirm or deny their request.`),
                confirmEmbed = u.embed().setTitle('Confirmation recieved.').setDescription('Starting the game...'),
                cancelEmbed = u.embed().setTitle('Cancelation acknowledged').setDescription(`Letting ${player1.username} know.`),
                confirm = u.confirmEmbed(player2, promptEmbed, confirmEmbed, cancelEmbed)
            if(confirm == true){
                player1.send(`${player2.username} accepted the request. Starting the game....`)
                let turn = Math.floor(Math.random() *2 ) +1
                player1 = turn == 1 ? player1 : player2
                player2 = turn == 1 ? player2 : msg.author
                db.get("Games").push({
                    p1: player1.id,
                    p2: player2.id,
                    board: ['1️⃣ 0 0 0','2️⃣ 0 0 0','3️⃣ 0 0 0','🆚 🇦 🇧 🇨'],
                    turn,
                }).write();
                let p1embed = u.embed().setTitle(`The Board`).setDescription(await replace(await findEntry.get('board').value())).setFooter(`Do \`!t xy\` to place an O (example: \`!t a1\`)`)
                let p2embed = p1embed.setFooter(`Do \`!t xy\` to pace an X (example: \`!t a1\`)`)
    
                player1.send(`${player1.id == msg.author.id ? `${player2.username} accepted the request!` : 'Confirmation recieved!'} Starting the game...\nIt's your turn!`,{embed: p1embed})
                player2.send(`${player2.id == msg.author.id ? `${player1.username} accepted the request!` : 'Confirmation recieved!'} Starting the game... It's ${player1.username}'s turn.`,{embed: p2embed})
            } 
            else if(confirm == false) return player1.send(`${player1.username} didn't want to play.`)
            else return player1.send(`The request was canceled because ${player2.username} didn't respond in time!`)
        }
        else{
            async function win(board, turn){
                let symbol = turn == '1' ? 'o' : 'x',
                reg = new RegExp(`${turn == '1' ? 'x' : 'o'}`,'g')
                board = board.join('\n').replace(reg, '0').split('\n')
                for(hor of board) if(hor.charAt(4) == symbol && hor.charAt(6) == symbol && hor.charAt(8) == symbol) return true
                if(board[0].charAt(4) == symbol && board[1].charAt(6) == symbol && board[2].charAt(8) == symbol) return true
                if(board[0].charAt(8) == symbol && board[1].charAt(6) == symbol && board[2].charAt(4) == symbol) return true
                for(let i = 4; i <  9; i = i+2) if(board[0].charAt(i) != '0' && board[1].charAt(i) != '0' && board[2].charAt(i) != '0') return true
                else return null
            }
            async function tie(board){
                if(board.join('').replace(/[^0]/g, '') == '') return true
                else return null
            }
            let test = /([a-c])([1-3])/gi.exec(suffix.toLowerCase().replace(' ', '')), 
                x = test ? test[1] : '',
                y = test ? test[2] : '',
                xes = ['a','b','c'],
                sendP1 = msg.client.users.cache.get(findEntry.get("p1").value()),
                sendP2 = msg.client.users.cache.get(findEntry.get("p2").value()),
                turn = findEntry.get('turn').value(),
                sendTo = (turn == '1' ? sendP1 : sendP2),
                sendToOpp = (turn == '1' ? sendP2 : sendP1);
            if(xes.includes(x) && y > 0 && y < 4){
                let pos = xes.indexOf(x)
                if((sendP1.id == msg.author.id && turn == '2') || (sendP2 == msg.author.id && turn == '1')) return msg.author.send("It's not your turn!")
                let boardVal = findEntry.get('board').value(),
                    index = 2*pos+4
                    newEmbed
                if(boardVal[y-1].charAt(index) != 0) return msg.author.send("That tile already has a marker on it!")
                try{
                    findEntry.get('board').assign({[y-1]: boardVal[y-1].substr(0, index)+`${turn == '1' ? 'o' : 'x'}`+boardVal[y-1].substr(index+1)}).write()
                    newEmbed = u.embed().setTitle('The Board').setDescription(await replace(findEntry.get('board').value())).setFooter(`To place your piece, (O), do \`!t xy\` (example: \`!b a1\`)`)
                    if(await win(boardVal, turn)){
                        sendTo.send({content: 'You won!', embed: newEmbed});
                        sendToOpp.send(`${sendTo.username} won! Better luck nex time.`, {embed: embed2});
                        return db.get('Games').remove(findEntry.get('p1').value() == msg.author.id ? {p1: msg.author.id} : {p2: msg.author.id}).write()
                    }
                    else if(await tie(boardVal)){
                        sendTo.send({content: 'It looks like this game is a draw.', embed: newEmbed})
                        sendToOpp.send({content: 'It looks like this game is a draw.', embed: newEmbed})
                        return db.get('Games').remove(findEntry.get('p1').value() == msg.author.id ? {p1: msg.author.id} : {p2: msg.author.id}).write()
                    }
                }
                catch (e) {return u.errorHandler(e, 'TTT game error')}
                sendP1.send(turn == '1' ? `Piece placed at ${x.toUpperCase()}${y}` : `It's your turn! ${sendP2.username} put a piece at ${x.toUpperCase()}${y}.`,{embed: newEmbed})
                sendP2.send(turn == '2' ? `Piece placed at ${x.toUpperCase()}${y}` : `It's your turn! ${sendP1.username} put a piece at ${x.toUpperCase()}${y}.`,{embed: newEmbed})
                return findEntry.assign({turn: turn == '1' ? '2' : '1'}).write()
            }
            else return msg.author.send("That's not the right format! Try something like `!t a1`")
        }
    }
})
.addCommand({name: "blackjack",
    process: async(msg, suffix)=>{
        db = low(new FileSync('jsons/blackjack.json'))
        db.defaults({Games: []}).write()
        let findEntry = db.get('Games').find({'p1': msg.author.id})
        if(db.get('Games').find({'p2': msg.author.id}).get('p2').value()) findEntry = db.get('Games').find({'p2': msg.author.id})
        async function replace(board){
            return board.join('\n').replace(/0/g, '🟦').replace(/x/g, '🇽').replace(/o/g, '🇴')
        }
        if(!findEntry.get('p1').value()){
            let player1 = msg.author,
                player2 = msg.mentions.users.first()

            if(!player2) return msg.channel.send("Who do you want to play against?")
            if(player1.id == player2.id) return msg.channel.send("You can't play against yourself, silly!")
            if(player2.bot) return msg.channel.send("You can't play against a bot. They're too good at the game")
            if(findEntry.get('p1').value() == player2.id || findEntry.get('p2').value() == player2.id) return msg.channel.send("That person is already in a game.")
            
            player1.send(`Game request sent to ${player2.username}. Waiting for their confirmation`)
            let promptEmbed = u.embed().setTitle('Tic Tac Toe Request').setDescription(`${player1.username} has requested to play a game of tic tak toe with you. Please confirm or deny their request.`),
                confirmEmbed = u.embed().setTitle('Confirmation recieved.').setDescription('Starting the game...'),
                cancelEmbed = u.embed().setTitle('Cancelation acknowledged').setDescription(`Letting ${player1.username} know.`),
                confirm = u.confirmEmbed(player2, promptEmbed, confirmEmbed, cancelEmbed)
            if(confirm == true){
                player1.send(`${player2.username} accepted the request. Starting the game....`)
                let turn = Math.floor(Math.random() *2 ) +1,
                    botDraws = [],
                    cardArray = [],
                    p1Draws = [],
                    p2Draws = []
                for(let i = 1; i < 57; i++) cardArray.push(i)
                player1 = turn == 1 ? player1 : player2
                player2 = turn == 1 ? player2 : msg.author
                while(botDraws.length < 3){
                    let tempDraws = []
                    let backupCardArray = cardArray
                    let card = cardArray[Math.floor(Math.random * cardArray.length)]
                    tempDraws.push(card)
                    cardArray = cardArray.filter(c => c != card)
                    if(tempDraws.reduce() > 21){
                        tempDraws = []
                        cardArray = backupCardArray
                    }
                    if(!tempDraws.reduce() < 21 && !tempDraws.reduce > 13) draw()
                    else botDraws = tempDraws
                }
                while(p1Draws.length < 3){
                    let backupCardArray = cardArray
                    let card = cardArray[Math.floor(Math.random * cardArray.length)]
                    p1Draws.push(card)
                    cardArray = cardArray.filter(c => c != card)
                    if(p1Draws.reduce() > 21){
                        p1Draws = []
                        cardArray = backupCardArray
                    }   
                    
                }
                while(p2Draws.length < 3){
                    let backupCardArray = cardArray
                    let card = cardArray[Math.floor(Math.random * cardArray.length)]
                    p2Draws.push(card)
                    cardArray = cardArray.filter(c => c != card)
                    if(p2Draws.reduce() > 21){
                        p2Draws = []
                        cardArray = backupCardArray
                    }
                }
                db.get("Games").push({
                    p1: player1.id,
                    p2: player2.id,
                    p1Draws,
                    p2Draws,
                    botDraws,
                    turn,
                    cardArray
                }).write();
                let p1embed = u.embed().setTitle(`The Board`).setDescription(await replace(await findEntry.get('board').value())).setFooter(`Do \`!t xy\` to place an O (example: \`!t a1\`)`)
                let p2embed = p1embed.setFooter(`Do \`!t xy\` to pace an X (example: \`!t a1\`)`)
    
                player1.send(`${player1.id == msg.author.id ? `${player2.username} accepted the request!` : 'Confirmation recieved!'} Starting the game...\nIt's your turn!`,{embed: p1embed})
                player2.send(`${player2.id == msg.author.id ? `${player1.username} accepted the request!` : 'Confirmation recieved!'} Starting the game... It's ${player1.username}'s turn.`,{embed: p2embed})
            } 
            else if(confirm == false) return player1.send(`${player1.username} didn't want to play.`)
            else return player1.send(`The request was canceled because ${player2.username} didn't respond in time!`)
        }
        else{
            
        }
    }
})
module.exports = Module