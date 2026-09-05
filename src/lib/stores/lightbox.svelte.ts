class Lightbox {
  images = $state<string[]>([]);
  index = $state(0);
  get open() {
    return this.images.length > 0;
  }
  get current() {
    return this.images[this.index] ?? null;
  }
  show(images: string[], index = 0) {
    this.images = images;
    this.index = Math.max(0, Math.min(index, images.length - 1));
  }
  close() {
    this.images = [];
    this.index = 0;
  }
  next() {
    if (this.images.length) this.index = (this.index + 1) % this.images.length;
  }
  prev() {
    if (this.images.length)
      this.index = (this.index - 1 + this.images.length) % this.images.length;
  }
}

export const lightbox = new Lightbox();
