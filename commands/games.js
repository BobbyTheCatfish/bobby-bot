const Augur = require('augurbot'),
  u = require('../utils/utils'),
  low = require('lowdb'),
  FileSync = require('lowdb/adapters/FileSync'),
  Module = new Augur.Module();
let db = low(new FileSync('jsons/battleship.json'));

// The generateBoard function below is a slightly modified version of Alden Bradford's, which you can find here: https://www.math.purdue.edu/~bradfoa/personal_projects/battleship/. All credit to Alden Bradford.
function generateBoard() {
  function parseShips(string) {
    const inputList = string.match(/\w,\d+/g);
    const ships = [];
    for (let i = 0; i < inputList.length; i++) {
      const pair = [];
      pair[0] = inputList[i].match(/\w/)[0];
      pair[1] = parseInt(inputList[i].match(/\d+/)[0], 10);
      ships[i] = pair;
    }
    return ships;
  }
  class Board {
    constructor() {
      this.rows = 10;
      this.cols = 10;
      this.cells = [];
      this.initializeCells();
      this.shipPairs = parseShips('(a,2),(b,3),(c,3),(d,4),(e,5)');
      this.failed = false;
    }
    initializeCells() {
      this.cells = [];
      for (let i = 0;i < this.cols;i++) {
        this.cells[i] = [];
        for (let j = 0;j < this.rows;j++) {
          this.cells[i][j] = new Cell();
        }
      }
    }
    appearance() {
      let string =
        "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i j k l m n o p q r s t u v w x y z";
      string = string.slice(0, this.cols * 2 + 2);
      string = string.concat('\n');
      for (let j = 0; j < this.rows; j++) {
        if (j < 9) string = string.concat('');
        string = string.concat(`${j + 1}`);
        for (let i = 0; i < this.cols; i++) {
          string = string.concat(" " + this.cells[i][j].appearance());
        }
        string = string.concat('\n');
      }
      string = string.slice(0, -1);
      return string;
    }
    placeShip(charLenPair) {
      const direction = ["v", "h"][Math.floor(Math.random() * 2)];
      let max_col = this.cols;
      let max_row = this.rows;
      if (direction === "v") max_row -= (charLenPair[1] - 1);
      if (direction === "h") max_col -= (charLenPair[1] - 1);
      if (max_row < 1 || max_col < 1) return false;
      const corner = [Math.floor(Math.random() * max_col),
        Math.floor(Math.random() * max_row)];
      const newShip = new Ship(charLenPair, direction, corner, this);
      if (newShip.canFit()) {
        newShip.insert();
        return true;
      } else {
        return false;
      }
    }
    placeShips() {
      for (let attempt = 0; attempt < 1000000; attempt++) {
        this.initializeCells();
        let attemptSuccessful = true;
        for (let i = 0; i < this.shipPairs.length; i++) {
          if (!this.placeShip(this.shipPairs[i])) {
            attemptSuccessful = false;
            break;
          }
        }
        if (attemptSuccessful) {
          return;
        }
      }
      this.failed = true;
    }
  }
  class Ship {
    constructor(charLenPair, orientation, corner, board) {
      this.appearance = charLenPair[0];
      this.length = charLenPair[1];
      this.orientation = orientation;
      this.corner = corner;
      this.board = board;
    }
    cells() {
      const cellList = [];
      if (this.orientation === "h") {
        for (let i = 0; i < this.length; i++) {
          cellList[i] = this.board.cells[this.corner[0] + i][this.corner[1] ];
        }
      }
      if (this.orientation === "v") {
        for (let i = 0; i < this.length; i++) {
          cellList[i] = this.board.cells[this.corner[0] ][this.corner[1] + i];
        }
      }
      return cellList;
    }
    canFit() {
      const cellList = this.cells();
      for (let i = 0; i < this.length; i++) {
        if (cellList[i].contains) return false;
      }
      return true;
    }
    insert() {
      const cellList = this.cells();
      for (let i = 0; i < this.length; i++) {
        cellList[i].contains = this;
      }
    }
  }
  class Cell {
    constructor() {
      this.contains = null;
    }
    appearance() {
      return this.contains ? this.contains.appearance : '~';
    }
  }
  const board = new Board();
  board.placeShips();
  if (board.failed) return null;
  return board.appearance().replace(/[^a-e~\n]/g, '').replace(/~/g, '0').split('\n').splice(1);
}
Module.addCommand({ name: "playing",
  onlyGuild: true,
  category: "Games",
  process: async (msg, args) => {
    function currentPlayers(game) {
      // List people playing the game
      const games = u.collection();
      for (const m of msg.guild.members.cache.map(a => a)) {
        if (m.user.bot) continue;
        const presence = m.presence?.activities.find(a => a.type == "PLAYING" && a.name.toLowerCase().startsWith(game.toLowerCase()));
        if (presence) {
          if (games.has(presence.name)) games.get(presence.name).players.push(`• ${m.toString()}`);
          else games.set(presence.name, { game: presence.name, players: [`• ${m.toString()}`] });
        }
      }
      const embed = u.embed().setTitle(`${msg.guild.name} members currently playing ${game}`).setTimestamp();
      games.sort((a, b) => a.game.localeCompare(b.game));
      if (games.size > 0) embed.setDescription(games.map(g => `**${g.game}**\n${g.players.join('\n')}\n\n`).join('\n'));
      else embed.setDescription(`I couldn't find any members playing ${game}.`);
      return embed;
    }
    if (args) {msg.reply({ embeds: [currentPlayers(args)], allowedMentions: { parse: [] } });} else {
      const games = u.collection();
      for (const memb of msg.guild.members.cache.map(me => me)) {
        if (memb.user.bot) continue;
        const game = memb.presence?.activities?.find(a => a.type == "PLAYING");
        if (game && !games.has(game.name)) {
          games.set(game.name, { game: game.name, players: 1, people: [memb.toString()] });
        } else if (game) {
          games.get(game.name).players++;
          games.get(game.name).people.push(memb.toString());
        }
      }
      const gameList = games.sort((a, b) => {
        if (b.players == a.players) return a.game.localeCompare(b.game);
        else return b.players - a.players;
      }).map(a => a);
      const min = Math.min(gameList.length, 25);
      const embed = u.embed().setTimestamp().setTitle(`Currently played games in ${msg.guild.name}`)
                .setDescription(`The ${min == 1 ? 'only game' : `top ${min} games`} currently being played in ${msg.guild.name}:`);
      if (gameList.length > 0) for (let i = 0; i < min; i++) embed.addFields([{ name: gameList[i].game, value: gameList[i].people.join('\n'), inline: true }]);
      else embed.setDescription("Well, this is awkward... Nobody is playing anything.");
      msg.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
  }
})
.addCommand({ name: "battleship",
  aliases: ['b'],
  category: "Games",
  process: async (msg, args) => {
    // 0 - Nothing 🟦
    // 1 - Ship ⬜
    // 2 - Ship Hit 💥
    // 3 - Miss 🟥
    db.defaults({ Games: [] }).write();
    function replace(board) {
      const prefixes = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
        final = [];
      let i = 0;
      for (const x of board.split('\n')) {
        final.push(`${prefixes[i]} ${x.split('').join(' ').replace(/0/g, '🟦').replace(/[a-e]/g, '⬜').replace(/2/g, '💥').replace(/3/g, '🟥')}`);
        i++;
      }
      final.push('🆚 🇦 🇧 🇨 🇩 🇪 🇫 🇬 🇭 🇮 🇯');
      return final.join('\n');
    }
    let findEntry = db.get("Games").find({ p1: msg.author.id });
    if (db.get("Games").find({ p2: msg.author.id }).get('p2').value()) findEntry = db.get("Games").find({ p2: msg.author.id });
    if (!findEntry.get("p1").value()) {
      const player1 = msg.author,
        player2 = msg.mentions.users.first();
      if (!player2) return msg.channel.send("Who do you want to play against?");
      if (player1.id == player2.id) return msg.channel.send("You can't play against yourself, silly!");
      if (player2.bot) return msg.channel.send("You can't play against a bot. They're too good at the game");
      if (findEntry.get('p1').value() == player2.id || findEntry.get('p2').value() == player2.id) return msg.channel.send("That person is already in a game.");

      msg.channel.send("Starting game...");
      player1.send(`Game request sent to ${player2.username}. Waiting for their confirmation`);
      const askEmbed = u.embed().setTitle(`Battleship Request from ${player1.username}`).setDescription(`${player1.username} has requested to play a game of battleship with you. Please confirm or deny their request`),
        confirmEmbed = u.embed().setTitle('Confirmation recieved').setDescription('Starting the game...'),
        cancelEmbed = u.embed().setTitle('Cancelation recieved').setDescription(`Letting ${player1.username} know.`),
        confirm = await u.confirmEmbed(player2, askEmbed, confirmEmbed, cancelEmbed);
      if (confirm == true) {
        db.get("Games").push({
          p1: player1.id,
          p2: player2.id,
          p1Rows: generateBoard(),
          p2Rows: generateBoard(),
          turn: Math.floor(Math.random() * 2) + 1,
        }).write();
        const p1embed1 = u.embed().setTitle(`Your Board`).setDescription(replace((await findEntry.get('p1Rows').value()).join('\n'))).setFooter("To send a torpedo, do !b <tile>. For example, !b a1"),
          p2embed1 = u.embed().setTitle(`Your Board`).setDescription(replace((await findEntry.get('p2Rows').value()).join('\n'))).setFooter("To send a torpedo, do !b <tile>. For example, !b a1"),
          p1embed2 = u.embed().setTitle(`${player2.username}'s Board`).setDescription(replace(await findEntry.get('p2Rows').value().join('\n').replace(/[a-e]/g, '0'))),
          p2embed2 = u.embed().setTitle(`${player1.username}'s Board`).setDescription(replace(await findEntry.get('p1Rows').value().join('\n').replace(/[a-e]/g, '0')));

        player1.send({ content: `It's ${findEntry.get('turn').value() == '1' ? 'your' : player2.username + '\'s' } turn`, embeds: [p1embed1] });
        player1.send({ embeds: [p1embed2] });
        player2.send({ content: `It's ${findEntry.get('turn').value() == '2' ? 'your' : player1.username + '\'s' } turn`, embeds: [p2embed1] });
        return player2.send({ embeds: [p2embed2] });
      } else if (confirm == false) {
        return player1.send(`${player1.username} didn't want to play.`);
      } else {
        return player1.send(`The request was canceled because ${player2.username} didn't respond in time!`);
      }
    } else {
      const test = /([a-j])(10|[1-9])/g.exec(args.toLowerCase().replace(' ', '')),
        x = test ? test[1] : '',
        y = test ? test[2] : '',
        xes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        sendP1 = msg.client.users.cache.get(findEntry.get("p1").value()),
        sendP2 = msg.client.users.cache.get(findEntry.get("p2").value()),
        turn = findEntry.get('turn').value(),
        sendTo = (turn == '1' ? sendP1 : sendP2),
        sendToOpp = (turn == '1' ? sendP2 : sendP1);
      if (xes.includes(x) && Math.round(y) > 0 < 11) {
        if ((sendP1.id == msg.author.id && turn == '2') || (sendP2 == msg.author.id && turn == '1')) return msg.author.send("It's not your turn!");
        const pos = xes.indexOf(x),
          row = findEntry.get(turn == 1 ? 'p2Rows' : 'p1Rows').value()[y - 1],
          letterArray = ['a', 'b', 'c', 'd', 'e'];
        const hit = letterArray.includes(row.charAt(pos)) ? row.charAt(pos) : false;
        if (['2', '3'].includes(row.charAt(pos))) return sendTo.send("You already hit that spot!").then(u.clean);
        const findRows = findEntry.get(turn == '1' ? 'p2Rows' : 'p1Rows');
        try {

          const str = findRows.get(y - 1).value();
          findRows.assign({ [y - 1]: str.substr(0, pos) + `${hit ? '2' : '3'}` + str.substr(pos + 1) }).write();

          if (!findRows.value().join('\n').replace(/[^a-e]/g, '')) {
            const r1 = replace(findEntry.get(turn == '1' ? 'p1Rows' : 'p2Rows').value().join('\n')),
              r2 = replace(findRows.value().join('\n')),
              embed1 = u.embed().setTitle(`Final Boards`).setDescription(`Your Board:\n${r1}`),
              embed2 = u.embed().setDescription(`${sendToOpp.username}'s board:\n${r2}`),
              embed3 = u.embed().setTitle(`Final Boards`).setDescription(`Your Board:\n${r1}`),
              embed4 = u.embed().setDescription(`${sendTo.username}'s board:\n${r2}`);
            sendTo.send({ content: 'You won!', embeds: [embed1] });
            sendTo.send({ embeds: [embed2] });
            sendToOpp.send({ content: `${sendTo.username} won! Better luck nex time.`, embeds: [embed3] });
            sendToOpp.send({ embeds: [embed4] });
            return db.get('Games').remove(findEntry.get('p1').value() == msg.author.id ? { p1: msg.author.id } : { p2: msg.author.id }).write();
          }
        } catch (e) {u.errorHandler(e, 'Battleship db write error');}

        const newTrackEmbed = u.embed().setTitle(`${turn == '1' ? sendP2.username : sendP1.username}'s board`).setDescription(replace(findEntry.get(turn == '1' ? 'p2Rows' : 'p1Rows').value().join('\n').replace(/[a-e]/g, '0'))),
          otherPEmbed = u.embed().setTitle(`Your board`).setDescription(replace(findRows.value().join('\n')));
        let sunk;
        if (hit && !(findEntry.get(turn == 1 ? 'p2Rows' : 'p1Rows').value()).join('').split('').includes(hit)) sunk = ['Patrol Boat', 'Submarine', 'Destroyer', 'Battleship', 'Carrier'][letterArray.indexOf(hit)];
        sendTo.send({ content: (hit ? `Hit! 💥 ${sunk ? `You sunk their ${sunk}!` : ''}` : 'Miss!'), embeds: [newTrackEmbed] });
        sendToOpp.send((`${x.toUpperCase()}${y}... ${hit ? `Hit!💥 ${sunk ? `Your ${sunk} was destroyed!` : ''}` : 'Miss!'}`), { embeds: [otherPEmbed] });
        return findEntry.assign({ turn: turn == '1' ? '2' : '1' }).write();
      } else if (args.toLowerCase() == 'quit') {
        const toQuitter = (msg.author.id == sendP1.id ? sendP1 : sendP2),
          toQuitted = (msg.author.id == sendP1.id ? sendP2 : sendP1);
        toQuitter.send("You forfeited the match. GG!");
        toQuitted.send(`${toQuitter.username} forfeited the match. GG!`);
        db.get('Games').remove(findEntry.get('p1').value() == msg.author.id ? { p1: msg.author.id } : { p2: msg.author.id }).write();
      } else if (args.toLowerCase() == 'remind') {
        sendToOpp.send(`${msg.author.username} wanted to remind you that it's your turn!`);
      } else {
        return msg.author.send("That's not the right format! Try something like !battleship b9");
      }
    }
  }
})
.addCommand({ name:"tictactoe",
  aliases: ['t'],
  process: async (msg, suffix) => {
    db = low(new FileSync('jsons/tictactoe.json'));
    db.defaults({ Games: [] }).write();
    const findEntry = db.get('Games').find({ 'p1': msg.author.id } || { 'p2': msg.author.id });
    /** @param {Array<string>} board*/
    function replace(board) {
      return board.join('\n').replace(/0/g, '🟦').replace(/x/g, '❎').replace(/o/g, '🅾️');
    }
    function win(board, turn) {
      const symbol = turn == '1' ? 'o' : 'x',
        reg = new RegExp(`${turn == '1' ? 'x' : 'o'}`, 'g');
      board = board.join('\n').replace(/^[xo0]/g, '').replace(reg, '0').split('\n');
      for (const hor of board) if (hor == `${symbol}${symbol}${symbol}`) return true;
      if (!(board[0][0] + board[1][1] + board[2][2]).includes('0')) return true;
      if (!(board[0][2] + board[1][1] + board[2][0]).includes('0')) return true;
      for (let i = 0; i < 3; i++) {
        if (!(board[0][i] + board[1][i] + board[2][i]).includes('0')) return true;
        else return null;
      }
    }
    function tie(board) {
      if (board.join('').replace(/[^0]/g, '') == '') return true;
      else return null;
    }
    if (!findEntry.get('p1').value()) {
      const player1 = msg.author;
      const player2 = msg.mentions.users.first();

      if (!player2) return msg.channel.send("Who do you want to play against?");
      if (player1.id == player2.id) return msg.channel.send("You can't play against yourself, silly!");
      if (player2.bot) return msg.channel.send("You can't play against a bot. They're too good at the game");
      if (db.get('Games').find({ 'p1': player2.id } || { 'p2': player2.id }).value()) return msg.channel.send("That person is already in a game.");
      player1.send(`Game request sent to ${player2.username}. Waiting for their confirmation`);
      const promptEmbed = u.embed().setTitle('Tic Tac Toe Request').setDescription(`${player1.username} has requested to play a game of tic tak toe with you. Please confirm or deny their request.`),
        confirmEmbed = u.embed().setTitle('Confirmation recieved.').setDescription('Starting the game...'),
        cancelEmbed = u.embed().setTitle('Cancelation acknowledged').setDescription(`Letting ${player1.username} know.`),
        confirm = await u.confirmEmbed(player2, promptEmbed, confirmEmbed, cancelEmbed);
      if (confirm == true) {
        player1.send({ embeds: [confirmEmbed.setTitle(`${player2.username} accepted the request`)] });
        const turn = Math.floor(Math.random() * 2) + 1;
        db.get("Games").push({
          p1: player1.id,
          p2: player2.id,
          board: ['1️⃣ 0 0 0', '2️⃣ 0 0 0', '3️⃣ 0 0 0', '🆚 🇦 🇧 🇨'],
          turn,
        }).write();
        const board = await findEntry.get('board').value();
        const p1embed = u.embed().setTitle(`It's ${turn == 1 ? 'your' : `${player1.username}'s`} turn!`).setDescription(replace(board)).setFooter(`Do \`!t xy\` to place an ❎ (example: \`!t a1\`)`);
        const p2embed = u.embed().setTitle(`It's ${turn == 2 ? 'your' : `${player1.username}'s`} turn!`).setDescription(replace(board)).setFooter(`Do \`!t xy\` to place an 🅾️ (example: \`!t a1\`)`);
        player1.send({ embeds: [p1embed] });
        player2.send({ embeds: [p2embed] });
      } else if (confirm == false) {
        return player1.send(`${player1.username} didn't want to play.`);
      } else {
        return player1.send(`The request was canceled because ${player2.username} didn't respond in time!`);
      }
    } else {
      const test = /([a-c])([1-3])/gi.exec(suffix.replace(/ /g, ''));
      const x = test ? test[1] : '';
      const y = test ? test[2] : '';
      const xes = ['a', 'b', 'c'];
      const p1 = msg.client.users.cache.get(findEntry.get("p1").value());
      const p2 = msg.client.users.cache.get(findEntry.get("p2").value());
      const turn = findEntry.get('turn').value();
      const sendTo = (turn == '1' ? p1 : p2);
      const sendToOpp = (turn == '1' ? p1 : p2);
      if (xes.includes(x) && y > 0 && y < 4) {
        const pos = xes.indexOf(x);
        if (turn == 1 ? p1.id == msg.author.id : p2.id == msg.author.id) return msg.author.send("It's not your turn!");
        const boardVal = findEntry.get('board').value();
        const index = 2 * pos + 4;
        let newEmbed;
        if (boardVal[y - 1][index] != '0') return msg.author.send("That tile already has a marker on it!");
        try {
          findEntry.get('board').assign({ [y - 1]: boardVal[y - 1].substr(0, index) + `${turn == '1' ? 'o' : 'x'}` + boardVal[y - 1].substr(index + 1) }).write();
          newEmbed = u.embed().setDescription(replace(boardVal)).setFooter('gg');
          if (win(boardVal, turn)) {
            sendTo.send({ embeds: [newEmbed.setTitle('Game Over! Result: VICTORY!')] });
            sendToOpp.send({ embeds: [newEmbed.setTitle('Game Over! Result: LOSS.')] });
            return db.get('Games').remove(sendTo.id = msg.author.id ? { p1: msg.author.id } : { p2: msg.author.id }).write();
          } else if (tie(boardVal)) {
            newEmbed.setTitle('Game Over! Result: Draw').setFooter("gg");
            sendTo.send({ embeds: [newEmbed] });
            sendToOpp.send({ embeds: [newEmbed] });
            return db.get('Games').remove(sendTo.id = msg.author.id ? { p1: msg.author.id } : { p2: msg.author.id }).write();
          }
        } catch (e) {return u.errorHandler(e, msg);}
        newEmbed.setFooter(`Do \`!t xy\` to place your piece (example: \`!t a1\`)`);
        p1.send({ embeds: [newEmbed.setTitle(turn == '1' ? `❎ placed at ${x.toUpperCase()}${y}` : `It's your turn! ${p2.username} put a 🅾️ at ${x.toUpperCase()}${y}.`)] });
        p2.send({ embeds: [newEmbed.setTitle(turn == '2' ? `🅾️ placed at ${x.toUpperCase()}${y}` : `It's your turn! ${p1.username} put a ❎ at ${x.toUpperCase()}${y}.`)] });
        return findEntry.assign({ turn: turn == '1' ? '2' : '1' }).write();
      } else {return msg.author.send("That's not the right format! Try something like `!t a1`");}
    }
  }
})
.addCommand({ name: "blackjack",
  process: async (msg) => {
    db = low(new FileSync('jsons/blackjack.json'));
    db.defaults({ Games: [] }).write();
    let findEntry = db.get('Games').find({ 'p1': msg.author.id });
    if (db.get('Games').find({ 'p2': msg.author.id }).get('p2').value()) findEntry = db.get('Games').find({ 'p2': msg.author.id });
    async function replace(board) {
      return board.join('\n').replace(/0/g, '🟦').replace(/x/g, '🇽').replace(/o/g, '🇴');
    }
    function draw() {
      return;
    }
    if (!findEntry.get('p1').value()) {
      let player1 = msg.author,
        player2 = msg.mentions.users.first();

      if (!player2) return msg.channel.send("Who do you want to play against?");
      if (player1.id == player2.id) return msg.channel.send("You can't play against yourself, silly!");
      if (player2.bot) return msg.channel.send("You can't play against a bot. They're too good at the game");
      if (findEntry.get('p1').value() == player2.id || findEntry.get('p2').value() == player2.id) return msg.channel.send("That person is already in a game.");

      player1.send(`Game request sent to ${player2.username}. Waiting for their confirmation`);
      const promptEmbed = u.embed().setTitle('Tic Tac Toe Request').setDescription(`${player1.username} has requested to play a game of tic tak toe with you. Please confirm or deny their request.`),
        confirmEmbed = u.embed().setTitle('Confirmation recieved.').setDescription('Starting the game...'),
        cancelEmbed = u.embed().setTitle('Cancelation acknowledged').setDescription(`Letting ${player1.username} know.`),
        confirm = u.confirmEmbed(player2, promptEmbed, confirmEmbed, cancelEmbed);
      if (confirm == true) {
        player1.send(`${player2.username} accepted the request. Starting the game....`);
        const turn = Math.floor(Math.random() * 2) + 1;
        let botDraws = [],
          cardArray = [],
          p1Draws = [],
          p2Draws = [];
        for (let i = 1; i < 57; i++) cardArray.push(i);
        player1 = turn == 1 ? player1 : player2;
        player2 = turn == 1 ? player2 : msg.author;
        while (botDraws.length < 3) {
          let tempDraws = [];
          const backupCardArray = cardArray;
          const card = cardArray[Math.floor(Math.random * cardArray.length)];
          tempDraws.push(card);
          cardArray = cardArray.filter(c => c != card);
          if (tempDraws.reduce() > 21) {
            tempDraws = [];
            cardArray = backupCardArray;
          }
          if (!tempDraws.reduce() < 21 && !tempDraws.reduce > 13) draw();
          else botDraws = tempDraws;
        }
        while (p1Draws.length < 3) {
          const backupCardArray = cardArray;
          const card = cardArray[Math.floor(Math.random * cardArray.length)];
          p1Draws.push(card);
          cardArray = cardArray.filter(c => c != card);
          if (p1Draws.reduce() > 21) {
            p1Draws = [];
            cardArray = backupCardArray;
          }

        }
        while (p2Draws.length < 3) {
          const backupCardArray = cardArray;
          const card = cardArray[Math.floor(Math.random * cardArray.length)];
          p2Draws.push(card);
          cardArray = cardArray.filter(c => c != card);
          if (p2Draws.reduce() > 21) {
            p2Draws = [];
            cardArray = backupCardArray;
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
        const p1embed = u.embed().setTitle(`The Board`).setDescription(await replace(await findEntry.get('board').value())).setFooter(`Do \`!t xy\` to place an O (example: \`!t a1\`)`);
        const p2embed = p1embed.setFooter(`Do \`!t xy\` to pace an X (example: \`!t a1\`)`);

        player1.send({ content: `${player1.id == msg.author.id ? `${player2.username} accepted the request!` : 'Confirmation recieved!'} Starting the game...\nIt's your turn!`, embeds: [p1embed] });
        player2.send({ content: `${player2.id == msg.author.id ? `${player1.username} accepted the request!` : 'Confirmation recieved!'} Starting the game... It's ${player1.username}'s turn.`, embeds: [p2embed] });
      } else if (confirm == false) {
        return player1.send(`${player1.username} didn't want to play.`);
      } else {
        return player1.send(`The request was canceled because ${player2.username} didn't respond in time!`);
      }
    } else {
      return;
    }
  }
});
module.exports = Module;