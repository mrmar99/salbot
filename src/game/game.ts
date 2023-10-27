import { Board, BoardType } from "./board";
import { Queue } from "./queue";
import { Player } from "./player";
import { PlayersVisualizer } from "./playersVisualizer";
import path from "path";

export class Game {
  public queue: Queue<Player> = new Queue<Player>();
  private B!: Board;
  private _boardUrl!: string;
  private PV!: PlayersVisualizer;
  private isGameStarted: boolean = false;

  setBoard(board: BoardType, boardUrl: string): void {
    this.B = new Board(board);
    this._boardUrl = boardUrl;
  }

  get boardUrl(): string {
    return path.resolve(__dirname, this._boardUrl);
  }

  get isStarted(): boolean {
    return this.isGameStarted;
  }

  start(players: Record<number, Player>): { firstPlayer: Player, boardUrlPV: string } | null {
    const playersArr = Object.values(players);
    const playersCnt = playersArr.length;
    if (playersCnt < 1) return null;

    this.PV = new PlayersVisualizer(players, this.boardUrl, this.B.options);
    const boardUrlPV = this.PV.boardUrlPV();

    for (const player of playersArr) {
      player.status = 'playing';
      player.prevPos = 1;
      player.pos = 1;
    }

    for (const player of playersArr) {
      this.queue.enqueue(player);
    }

    this.isGameStarted = true;
    
    return { firstPlayer: this.queue.peek(), boardUrlPV };
  }

  stop(): void {
    while (this.queue.length) {
      this.queue.dequeue();
    }
    this.isGameStarted = false;
  }

  dice(val: number): Player {
    const player = this.queue.peek();

    player.updateMovesSum(val);

    player.prevPos = player.pos;

    if (player.movesSum === 18) {
      player.pos = 1;
      this.queue.enqueue(player);
      this.PV.updateBoard(player);
      return player;
    }
    
    player.pos += val;

    if (player.pos === 100) {
      player.status = 'won';
      this.PV.updateBoard(player);
      return player;
    } else if (player.pos > 100) {
      player.pos = 100 - player.pos % 100;
    }

    while (player.pos in this.B.sal) {
      player.pos = this.B.sal[player.pos];
    }

    this.PV.updateBoard(player);

    return player;
  }

  nextPlayer(): Player {
    const player = this.queue.dequeue();
    this.queue.enqueue(player);
    return this.queue.peek();
  }

  get hasFinished(): boolean {
    if (this.queue.length === 1) {
      const player = this.queue.peek();
      player.status = 'lost';
      return true;
    } else {
      return false;
    }
  }

  get lastPlayer(): Player {
    return this.queue.dequeue();
  }
}