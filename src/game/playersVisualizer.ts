import { Canvas, CanvasRenderingContext2D, Image, createCanvas, loadImage } from 'canvas';
import { Player } from './player';
import { BoardOptions } from './board';
import fs from 'fs';
import path from 'path';

export class PlayersVisualizer {
  private players!: Record<number, Player>;
  private boardOptions!: BoardOptions;
  private boardHash!: Record<number, { i: number, j: number }>;
  private img!: Image;
  private canvas!: Canvas;
  private context!: CanvasRenderingContext2D;

  public boardPVBuffer!: Buffer;

  constructor(players: Record<number, Player>, boardOptions: BoardOptions) {
    this.players = players;
    this.boardOptions = boardOptions;
    this.boardHash = {};

    const { row, col } = boardOptions;
    this.setStandardBoardHash(row, col);
  }

  async setImage(imgUrl: string): Promise<void> {
    this.img = await loadImage(imgUrl);
    this.drawImageOnCanvas();
    this.drawPlayers();
    this.boardPVBuffer = this.canvas.toBuffer();
  }

  updateBoard(player: Player): void {
    this.drawImageOnCanvas();
    this.players[player.id] = player;
    this.drawPlayers();
    this.boardPVBuffer = this.canvas.toBuffer();
  }

  private drawImageOnCanvas(): void {
    const { width, height } = this.img;
    this.canvas = createCanvas(width, height);
    this.context = this.canvas.getContext('2d');
    this.context.drawImage(this.img, 0, 0, width, height);
  }

  private drawPlayers(): void {
    for (const p in this.players) {
      const { prevPos, pos, color } = this.players[p];

      const { i: prevI, j: prevJ } = this.boardHash[prevPos];
      const { i, j } = this.boardHash[pos];

      const { x: prevX, y: prevY } = this.cellXY(prevI, prevJ);
      const { x, y } = this.cellXY(i, j);

      this.drawPlayer(prevX, prevY, color, 0.5);
      this.drawPlayer(x, y, color);
    }
  }

  private drawPlayer(x: number, y: number, color: string, opacity: number = 1): void {
    const { cellW, cellH } = this.boardOptions;
    const radius = (cellW + cellH) / 4;

    this.context.lineWidth = 2;
    this.context.fillStyle = this.getColor(color, opacity);
    this.context.strokeStyle = 'rgba(255,255,255,1)';
    this.context.beginPath();
    this.context.arc(x + radius, y + radius, radius / 1.75, 0, 2 * Math.PI);
    this.context.fill();
    this.context.stroke();
    this.context.beginPath();
    this.context.arc(x + radius, y + radius, radius / 2.75, 0, 2 * Math.PI);
    this.context.fill();
    this.context.stroke();
  }

  private cellXY(i: number, j: number): { x: number, y: number } {
    let { paddingLeft, paddingTop, gapV, gapH, cellW, cellH } = this.boardOptions; 

    const x = paddingLeft + j * (cellW + gapV);
    const y = paddingTop + i * (cellH + gapH);

    return { x, y };
  }

  private getColor(colorName: string, opacity: number): string {
    const colors: Record<string, string> = {
      'red': `rgba(188,21,21,${opacity})`,
      'orange': `rgba(210,105,0,${opacity})`,
      'yellow': `rgba(255,205,0,${opacity})`,
      'green': `rgba(15,150,0,${opacity})`,
      'blue': `rgba(5,55,175,${opacity})`,
      'purple': `rgba(170,35,240,${opacity})`,
      'black': `rgba(0,0,0,${opacity})`,
      'white': `rgba(217,217,217,${opacity})`,
      'brown': `rgba(100,45,10,${opacity})`
    };

    return colors[colorName];
  }

  private setStandardBoardHash(row: number, col: number): void {
    let pos = row * col; 
    for (let i = 0; i < row; i++) {      
      if (i % 2 === 0) {
        for (let j = 0; j < col; j++) {
          this.boardHash[pos] = { i, j };
          pos--;
        }
      } else {
        for (let j = col - 1; j >= 0; j--) {
          this.boardHash[pos] = { i, j };
          pos--;
        }
      }
    }
  }
}