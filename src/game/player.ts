import { Queue } from "./queue";

export class Player {
  id: number;
  private _lastMoves: Queue<number>;

  public status: string;
  public pos: number;
  public prevPos: number;
  public movesSum: number;
  public color: string;
  public visibleName: string;

  constructor(id: number) {
    this.id = id;
    this.prevPos = 0;
    this.pos = 0;
    this.status = 'waiting';
    this._lastMoves = new Queue();
    this._lastMoves.enqueue(0, 0, 0);
    this.movesSum = 0;
    this.color = '';
    this.visibleName = '';
  }

  updateMovesSum(diceVal: number): void {
    const first = this._lastMoves.dequeue();
    this._lastMoves.enqueue(diceVal);
    this.movesSum = this.movesSum - first + diceVal;
  }
}