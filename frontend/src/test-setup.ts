/**
 * jsdom has `<dialog>` but not its modal API. This stands in for it in tests: `showModal()` opens
 * the dialog, `close()` closes it and fires `close`, as browsers do. The focus trap and the inert
 * page behind are the browser's job and are checked in the running app.
 */
const dialog = HTMLDialogElement.prototype;

dialog.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};

dialog.close ??= function (this: HTMLDialogElement) {
  if (!this.open) {
    return;
  }
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

/**
 * Specs run in Spanish, the source Language of the templates (ADR 0005), whatever the machine's
 * own: jsdom would otherwise report `en-US`. A spec that needs another browser Language spies on
 * `navigator.languages`, and restoring the spy comes back here.
 */
Object.defineProperty(navigator, 'languages', { get: () => ['es-ES'], configurable: true });
