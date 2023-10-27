export class Queue<T> {
  private elements: Record<number, T>; // Объявляем объект для хранения элементов
  private head: number;
  private tail: number;

  constructor() {
    this.elements = {};
    this.head = 0;
    this.tail = 0;
  }

  enqueue(...elementsArr: T[]): void {
    for (const element of elementsArr) {
      this.elements[this.tail] = element;
      this.tail++;
    }
  }

  dequeue(): T {
    const item = this.elements[this.head];
    delete this.elements[this.head];
    this.head++;
    return item;
  }

  peek(): T {
    return this.elements[this.head];
  }

  get length(): number {
    return this.tail - this.head;
  }
  
  get isEmpty(): boolean {
    return this.length === 0;
  }
}