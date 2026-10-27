export class Economy {
  private currentFunds: number;
  private listeners: Set<(funds: number) => void> = new Set();

  constructor(initialFunds: number = 10000) {
    this.currentFunds = initialFunds;
  }

  get funds(): number {
    return this.currentFunds;
  }

  public getFunds(): number {
    return this.currentFunds;
  }

  public hasFunds(amount: number): boolean {
    return this.currentFunds >= amount;
  }

  public spend(amount: number): boolean {
    if (amount < 0) {
      return false;
    }
    if (!this.hasFunds(amount)) {
      return false;
    }
    this.currentFunds -= amount;
    this.notifyListeners();
    return true;
  }

  public earn(amount: number): void {
    if (amount <= 0) {
      return;
    }
    this.currentFunds += amount;
    this.notifyListeners();
  }

  public setFunds(amount: number): void {
    this.currentFunds = amount;
    this.notifyListeners();
  }

  public subscribe(listener: (funds: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentFunds);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentFunds);
    }
  }
}
