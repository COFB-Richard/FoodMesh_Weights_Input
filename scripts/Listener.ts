export class Listener {
  elm: HTMLElement | Document;
  eventName: string;
  func: (e: Event) => void;
  addListener() {
    this.elm.addEventListener(this.eventName, this.func);
    return this;
  }
  removeListener() {
    this.elm.removeEventListener(this.eventName, this.func);
  }
  /**
   * addEventListener will be called automatically unless noStart is set
   * @param elm
   * @param eventName
   * @param func
   * @param noStart
   */
  constructor(elm: HTMLElement | Document, eventName: string, func: (e: Event) => void, noStart?: boolean) {
    this.elm = elm;
    this.eventName = eventName;
    this.func = func;
    if (!noStart) {
      this.addListener();
    }
  }
}
