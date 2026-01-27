class ProcessingService {
  constructor() {
    this.component = null;
    this.operations = new Map();
    this.nextId = 0;
  }

  setComponent(component) {
    this.component = component;
  }

  show(options) {
    if (!this.component) {
      console.warn("ProcessingIndicator component not registered");
      return null;
    }

    const id = this.nextId++;
    this.operations.set(id, options);

    this._updateDisplay();

    return id;
  }

  updateProgress(id, progress, message = null) {
    if (this.operations.has(id)) {
      const options = this.operations.get(id);
      options.progress = progress;
      if (message) options.message = message;
      this._updateDisplay();
    }
  }

  updateMessage(id, message, subtitle = null) {
    if (this.operations.has(id)) {
      const options = this.operations.get(id);
      options.message = message;
      if (subtitle !== null) options.subtitle = subtitle;
      this._updateDisplay();
    }
  }

  hide(id) {
    if (id === null || id === undefined) {
      console.warn("hide() called without ID");
      return;
    }

    if (this.operations.has(id)) {
      this.operations.delete(id);
      console.log(
        `Hide called for ID: ${id}. Remaining operations: ${this.operations.size}`
      );

      if (this.operations.size === 0) {
        this.component.hide();
      } else {
        this._updateDisplay();
      }
    }
  }

  _updateDisplay() {
    if (this.operations.size === 0) {
      this.component.hide();
      return;
    }

    const operations = Array.from(this.operations.values());
    const criticalOp = operations.find((op) => op.critical);
    const displayOp = criticalOp || operations[operations.length - 1];

    this.component.show(displayOp);
  }

  reset() {
    this.operations.clear();
    if (this.component) {
      this.component.hide();
    }
    console.log("ProcessingService reset");
  }

  showSnackbar(message, options = {}) {
    return this.show({
      message,
      critical: false,
      ...options,
    });
  }

  showOverlay(message, options = {}) {
    return this.show({
      message,
      critical: true,
      ...options,
    });
  }

  showWithProgress(message, progress = 0, options = {}) {
    return this.show({
      message,
      progress,
      ...options,
    });
  }
}

export default new ProcessingService();
