// PROTOTYPE (#118), throwaway: a fake of Chromium's own install dialog (what `prompt()` shows).
// Deliberately not in the house style: it stands for browser chrome, not for SecretMatch.
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-proto-native-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      aria-label="Instalar app (diálogo del navegador)"
      class="mx-auto mt-4 w-[min(22rem,calc(100vw-2rem))] p-0 backdrop:bg-scrim"
      style="
        font-family: system-ui, sans-serif;
        background: #fff;
        color: #1f1f1f;
        border: 1px solid #c7c7c7;
        border-radius: 12px;
        box-shadow: 0 8px 28px rgb(0 0 0 / 0.3);
      "
      (cancel)="$event.preventDefault(); answered.emit(false)"
    >
      <div style="padding: 16px 20px">
        <p
          style="font-size: 11px; color: #5f6368; text-transform: uppercase; letter-spacing: 0.05em"
        >
          (diálogo del navegador)
        </p>
        <div style="display: flex; gap: 12px; align-items: center; margin-top: 10px">
          <img src="/icons/icon-192.png" alt="" width="40" height="40" style="border-radius: 8px" />
          <div>
            <p style="font-size: 16px; font-weight: 600">¿Instalar app?</p>
            <p style="font-size: 13px; color: #5f6368">SecretMatch · secretmatch.app</p>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px">
          <button
            type="button"
            style="padding: 8px 16px; border-radius: 18px; border: 1px solid #c7c7c7; color: #0b57d0"
            (click)="answered.emit(false)"
          >
            Cancelar
          </button>
          <button
            type="button"
            style="padding: 8px 16px; border-radius: 18px; background: #0b57d0; color: #fff"
            (click)="answered.emit(true)"
          >
            Instalar
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class ProtoNativeDialog {
  readonly open = input.required<boolean>();
  /** true: Instalar; false: Cancelar or Escape. */
  readonly answered = output<boolean>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }
}
