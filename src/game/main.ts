// import { Game } from "./game";
// import { Player } from "./player";
// import boards from './boards.json';

// const players: Player[] = [
//   new Player(0),
//   new Player(1),
//   new Player(2),
// ];

// const G = new Game(boards[0]);
// const winners: Player[] = [];

// let moves = 1;
// while (true) {
//   const diceVal = Math.floor(Math.random() * 6 + 1);
//   const player = G.dice(diceVal);

//   if (player.status === 'won') {
//     winners.push(player);
//   }

//   if (G.hasFinished) {
//     console.log(diceVal);
//     console.log(winners.length, 'WINNERS:');
//     console.log(winners);
//     console.log(G.lastPlayer);
//     console.log('ИГРА КОНЧИЛАСЬ ЗА', moves, 'ХОДОВ');
//     break;
//   } else {
//     console.log('Ход', moves, 'dice:', diceVal, '-----', player);
//   }

//   moves++;
// }
