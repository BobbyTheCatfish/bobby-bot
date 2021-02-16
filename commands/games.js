const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    low = require('lowdb'),
    FileSync = require('lowdb/adapters/FileSync'),
    adapter = new FileSync('jsons/battleship.json'),
    db = low(adapter),
    blankBoard = `on 0 0 0 0 0 0 0 0 0 0
tw 0 0 0 0 0 0 0 0 0 0
th 0 0 0 0 0 0 0 0 0 0
4️⃣ 0 0 0 0 0 0 0 0 0 0
5️⃣ 0 0 0 0 0 0 0 0 0 0
6️⃣ 0 0 0 0 0 0 0 0 0 0
7️⃣ 0 0 0 0 0 0 0 0 0 0
8️⃣ 0 0 0 0 0 0 0 0 0 0
9️⃣ 0 0 0 0 0 0 0 0 0 0
te 0 0 0 0 0 0 0 0 0 0
🆚 🇦 🇧 🇨 🇩 🇪 🇫 🇬 🇭 🇮 🇯`
//0 - Nothing 🟦
//1 - Ship ⬜
//2 - Ship Hit 💥
//3 - Miss 🟥
const Module = new Augur.Module();
function generateBoard(){
    let brd = new Board();
    brd.placeShips();
    if (brd.failed) return null
    let board = brd.appearance().replace(/1\b/g,'on').replace(/2\b/g, 'tw').replace(/3\b/g, 'th').replace(/4\b/g, '4️⃣').replace(/5\b/g, '5️⃣').replace(/6\b/g, '6️⃣').replace(/7\b/g, '7️⃣').replace(/8\b/g, '8️⃣').replace(/9\b/g, '9️⃣').replace(/[a-e]/g, '1').replace(/10\b/g, 'te').replace(/[A-Z]/g, '').replace(/~/g, '0')
    board = board.split('\n').splice(1)
    board.push('🆚 🇦 🇧 🇨 🇩 🇪 🇫 🇬 🇭 🇮 🇯')
    let row = brd.appearance().replace(/[^a-e~\n]/g, '').replace(/[a-e]/g, '1').replace(/~/g, '0').split('\n').splice(1)
    return {board, row}
}
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
function replace(board){
    let replacements = [[/ 0/g, ' 🟦'],[/ 1/g, ' ⬜'],[/ 2/g, ' 💥'],[/ 3/g, ' 🟥'],['on', '1️⃣'],['tw', '2️⃣'],['th', '3️⃣'],['te', '🔟']]
    for(x of replacements) board = board.replace(x[0], x[1])
    return board
}
class Board {
constructor(form){
    this.rows = 10;
    this.cols = 10;
    this.cells = [];
    this.initializeCells();
    this.shipPairs = parseShips('(a,5),(b,4),(c,3),(d,3),(e,2)');
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
Module.addCommand({name: "playing",
    guildOnly: true,
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
    process: async(message, args) =>{
        db.defaults({ Games: []}).write()
        let findEntry = db.get("Games").find({p1: message.author.id})
        if(db.get("Games").find({p2: message.author.id}).get('p2').value()) findEntry = db.get("Games").find({p2: message.author.id})
        
        if(!findEntry.get("p1").value())
        {
            let player1 = message.author
            let player2 = message.mentions.users.first()
            if(!player2) return message.channel.send("Who do you want to play against?")
            if(player1.id == player2.id) return message.channel.send("You can't play against yourself, silly!")
            if(player2.bot) return message.channel.send("You can't play against a bot. They're too good at the game")
            message.channel.send("Starting game...")
            player1.send(`Game request sent to ${player2.username}. Waiting for their confirmation`)
            player2.send(`${player1.username} has requested to play a game of battleship with you. Please confirm or deny their request.`).then(async startDM => {
                let filter = (reaction, user) => {return ['✅', '🛑'].includes(reaction.emoji.name) && user.id === player2.id;};
                await startDM.react('✅')
                await startDM.react('🛑')
                startDM.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] }).then(collected => {
                    const reaction = collected.first();
                    if (reaction.emoji.name == '✅'){
                        player1.send(`${player2.username} accepted the request. Starting the game....`)
                        player2.send(`Confirmation recieved. Starting the game...`)
                        let p1b = generateBoard()
                        let p2b = generateBoard()
                        db.get("Games").push({
                            p1: player1.id,
                            p2: player2.id,
                            p1board: p1b.board,
                            p2board: p2b.board,
                            p1Blank: blankBoard.split('\n'),
                            p2Blank: blankBoard.split('\n'),
                            p1Rows: p1b.row,
                            p2Rows: p2b.row,
                            turn: '1',
                            p1Hits: 0,
                            p2Hits: 0
                        }).write();
                        let p1embed1 = u.embed().setTitle(`Your Board`).setDescription(replace(findEntry.get('p1board').value().join('\n'))).setFooter("To send a torpedo, do !b <tile>. For example, !b a1")
                        let p2embed1 = u.embed().setTitle(`Your Board`).setDescription(replace(findEntry.get('p2board').value().join('\n'))).setFooter("To send a torpedo, do !b <tile>. For example, !b a1")
                        let p1embed2 = u.embed().setTitle(`${player2.username}'s Board`).setDescription(replace(findEntry.get('p2Blank').value().join('\n')))
                        let p2embed2 = u.embed().setTitle(`${player1.username}'s Board`).setDescription(replace(findEntry.get('p1Blank').value().join('\n')))

                        player1.send({embed: p1embed1})
                        player1.send({embed: p1embed2})
                        player2.send({embed: p2embed1})
                        player2.send({embed: p2embed2})
                    } 
                    else{
                        player2.send(`Cancelation recieved. Letting ${player1.username} know.`)
                        return player1.send(`${player1.username} canceled the game.`)
                    }
                }).catch((err) => {
                    player1.send(`The request timed out.`)
                    return player2.send(`The request timed out.`)
                })
            })
        }
        else{
            let x = args.toLowerCase().split(/(\d+)/)[0]
            let y = args.toLowerCase().split(/(\d+)/)[1]
            if(args.includes(' ')){
                x = args.toLowerCase().split(' ')[0]
                y = args.toLowerCase().split(' ')[1]
            }
            let xes = ['a','b','c','d','e','f','g','h','i','j']
            let ys =  ['1','2','3','4','5','6','7','8','9','10']
            if(xes.includes(x) && ys.includes(y)){
                let pos = xes.indexOf(x)
                let sendP1 = message.client.users.cache.get(findEntry.get("p1").value())
                let sendP2 = message.client.users.cache.get(findEntry.get("p2").value())
                let turn = findEntry.get('turn').value()
                let sendTo = (turn == '1' ? sendP1 : sendP2);
                let sendToOpp = (turn == '1' ? sendP2 : sendP1);
                if((message.author.id == sendP1.id && turn == '2') || (message.author.id == sendP2.id && turn == '1')) return message.author.send("It's not your turn!")
                let row = findEntry.get(turn == 1 ? 'p2Rows' : 'p1Rows').value()[y-1]
                if(['2','3'].includes(row.charAt(pos))) return sendTo.send("You already hit that spot!").then(u.clean)
                let hit = row.charAt(pos) == 1 ? true : false
                try{
                    sendTo.send(hit ? 'Hit! 💥' : 'Miss!')
                    sendToOpp.send(`${x.toUpperCase()}${y}... ${hit ? 'Hit!💥' : 'Miss!'}`).then(u.clean)
                    if (hit) findEntry.assign(turn == '1' ? {p1Hits: findEntry.get('p1Hits').value()+1} : {p2Hits: findEntry.get('p2Hits').value()+1}).write()
                    
                    let str = findEntry.get(turn == '1' ? 'p2Blank' : 'p1Blank').get(y-1).value()
                    let index = 2*(pos)+4
                    if(['1','2','3','10'].includes(y)) index = index - 1
                    findEntry.get(turn == '1' ? 'p2Blank' : 'p1Blank').assign({[y-1]: str.substr(0, index)+`${hit ? '2' : '3'}`+str.substr(index+1)}).write()
                    
                    str = findEntry.get(turn == '1' ? 'p2Rows' : 'p1Rows').get(y-1).value()
                    findEntry.get(turn == '1' ? 'p2Rows' : 'p1Rows').assign({[y-1]: str.substr(0, pos)+`${hit ? '2' : '3'}`+str.substr(pos+1)}).write()

                    str = findEntry.get(turn == '1' ? 'p2board' : 'p1board').get(y-1).value()
                    findEntry.get(turn == '1' ? 'p2board' : 'p1board').assign({[y-1]: str.substr(0, index)+`${hit ? '2' : '3'}`+str.substr(index+1)}).write()

                    if(findEntry.get(turn == '1' ? 'p1Hits' : 'p2Hits').value() >= 17 || !findEntry.get(turn == '1' ? 'p2board' : 'p1board').value().join('\n').includes('1')){
                        sendTo.send('You won!');
                        sendToOpp.send(`${sendTo.username} won! Better luck nex time.`);
                        return
                    }
                }
                catch (e) {u.errorHandler(e, 'Battleship game error')}
                let newTrackEmbed = u.embed().setTitle(`${turn == '1' ? sendP2.username : sendP1.username}'s board`).setDescription(replace(findEntry.get(turn == '1' ? 'p2Blank' : 'p1Blank').value().join('\n')))
                let otherPEmbed = u.embed().setTitle(`Your board`).setDescription(replace(findEntry.get(turn == '1' ? 'p2board' : 'p1board').value().join('\n')))
                sendTo.send(newTrackEmbed)
                sendToOpp.send(otherPEmbed)
                return findEntry.assign({turn: turn == '1' ? '2' : '1'}).write()
            }
            else if(args.toLowerCase() == 'quit'){
                let whodidit = message.author
                if(findEntry.get('p2').value() == message.author.id) whodidit = message.client.users.cache.get(findEntry.get('p2').value())
                message.client.users.cache.get(findEntry.get("p1").value()).send(`${whodidit.id == findEntry.get('p1').value() ? 'You forfitted the match': `${whodidit.username} forfitted.`}`)
                message.client.users.cache.get(findEntry.get("p2").value()).send(`${whodidit.id == findEntry.get('p2').value() ? 'You forfitted the match': `${whodidit.username} forfitted.`}`)
                if(findEntry.get('p1').value() == message.author.id) db.get('Games').remove({p1: message.author.id}).write()
                else db.get('Games').remove({p2: message.author.id}).write()
            }
            else if(args.toLowerCase() == 'remind'){
                if(turn == '1' && msg.author.id == findEntry.get('p1').value()) message.client.users.cache.get(findEntry.get('p2').value()).send(`${message.author.username} wanted to remind you that it's your turn!`)
                else if(turn == '2' && msg.author.id == findEntry.get('p2').value()) message.client.users.cache.get(findEntry.get('p2').value()).send(`${message.author.username} wanted to remind you that it's your turn!`)
            }
            else return message.author.send("That's not the right format! Try something like !battleship b9")
        }
    }
})
module.exports = Module