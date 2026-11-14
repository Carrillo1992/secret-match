/*
 * PROTOTYPE (#87), throwaway: the icon button that opens the Preferences menu (new pattern in every
 * variant): 44 px, rounded-full, ink icon, hover:bg-subtle, primary focus outline. Over the gift
 * illustration it gets its own surface disc so it reads on the scene.
 */
import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { LucideSettings2 } from '@lucide/angular';

@Component({
  selector: 'app-prefs-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideSettings2],
  host: { class: 'inline-flex' },
  template: `
    <button
      #button
      type="button"
      class="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-200 hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
      [class.bg-surface]="onIllustration()"
      [class.shadow-card]="onIllustration()"
      [attr.aria-label]="label()"
      [attr.aria-expanded]="expanded()"
      [attr.aria-haspopup]="haspopup()"
      [attr.aria-controls]="controls()"
      (click)="toggle.emit()"
    >
      <svg lucideSettings2 [size]="22" aria-hidden="true"></svg>
    </button>
  `,
})
export class PrefsTrigger {
  readonly label = input.required<string>();
  readonly expanded = input.required<boolean>();
  readonly onIllustration = input(false);
  readonly haspopup = input<'true' | 'dialog'>('true');
  readonly controls = input<string>();
  readonly toggle = output<void>();

  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  focus(): void {
    this.button().nativeElement.focus();
  }
}
