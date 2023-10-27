export type BoardOptions = {
  row: number;
  col: number;
  cellW: number;
  cellH: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  gapV: number;
  gapH: number;
}

export type BoardType = {
  id: number;
  snakes: Record<string, number>;
  ladders: Record<string, number>;
  options: BoardOptions;
};

export class Board {
  private snakesAndLadders: Record<number, number>;
  private _options: BoardOptions;

  constructor({ snakes, ladders, options }: BoardType) {
    this.snakesAndLadders = {};
    this._options = options;
    
    for (let i = 1; i <= this.size; i++) {
      if (i in snakes) {
        this.snakesAndLadders[i] = snakes[i];
      }
      
      if (i in ladders) {
        this.snakesAndLadders[i] = ladders[i];
      }
    }
  }

  get options(): BoardOptions {
    return this._options;
  }

  get size(): number {
    return this._options.row * this._options.col;
  }

  get sal() {
    return this.snakesAndLadders;
  }
}