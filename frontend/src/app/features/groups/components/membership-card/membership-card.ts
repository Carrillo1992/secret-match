import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideLogOut } from '@lucide/angular';
import { Button } from '../../../../shared/ui/button/button';
import { TextLink } from '../../../../shared/ui/text-link/text-link';

/** Where the Member's request to leave stands, as the page tells it. */
export type LeaveStatus = 'idle' | 'leaving' | 'failed';

/**
 * The Member's own place in the Group: a regular Member can leave it, behind an inline
 * confirmation. The Admin cannot, so they are pointed to deleting the Group instead.
 */
@Component({
  selector: 'app-membership-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextLink, LucideLogOut],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-membership" class="rounded-card bg-surface p-5 shadow-card">
      <h2 id="group-membership" class="font-display text-lg font-semibold">Tu participación</h2>

      @if (admin()) {
        <p class="mt-1.5 text-ink-muted">
          Como administrador no puedes salir del grupo. Si ya no quieres seguir con él, podrás
          borrarlo.
        </p>
      } @else {
        <p class="mt-1.5 text-ink-muted">Si sales, dejarás de ver este grupo.</p>

        @if (status() === 'failed') {
          <p
            role="alert"
            class="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          >
            No hemos podido sacarte del grupo. Inténtalo de nuevo.
          </p>
        }

        @if (confirming()) {
          <div class="mt-4 rounded-field bg-canvas p-4">
            <p class="font-bold">¿Salir del grupo?</p>
            <p class="mt-1.5 text-sm text-ink-muted">Dejarás de ver el grupo y a sus miembros.</p>
            <div class="mt-4 flex flex-wrap items-center gap-4">
              <button #confirmButton type="button" appButton="secondary" (click)="confirm()">
                Sí, salir
              </button>
              <button type="button" appLink standalone (click)="cancel()">Cancelar</button>
            </div>
          </div>
        } @else {
          <button
            #leaveButton
            type="button"
            appButton="secondary"
            class="mt-4 w-full"
            [disabled]="status() === 'leaving'"
            (click)="startConfirming()"
          >
            <svg lucideLogOut [size]="18"></svg>
            {{ status() === 'leaving' ? 'Saliendo…' : 'Salir del grupo' }}
          </button>
        }
      }
    </section>
  `,
})
export class MembershipCard {
  /** Whether the Member looking is the Admin, who cannot leave. */
  readonly admin = input.required<boolean>();
  readonly status = input<LeaveStatus>('idle');
  /** The Member confirmed: the page asks the API to take them out. */
  readonly leave = output();

  protected readonly confirming = signal(false);
  private readonly injector = inject(Injector);
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');
  private readonly leaveButton = viewChild<ElementRef<HTMLButtonElement>>('leaveButton');

  /** The button that opened the confirmation disappears, so keyboard focus moves into it. */
  protected startConfirming(): void {
    this.confirming.set(true);
    this.focusAfterRender(() => this.confirmButton());
  }

  protected cancel(): void {
    this.confirming.set(false);
    this.focusAfterRender(() => this.leaveButton());
  }

  protected confirm(): void {
    this.confirming.set(false);
    this.leave.emit();
    this.focusAfterRender(() => this.leaveButton());
  }

  private focusAfterRender(target: () => ElementRef<HTMLButtonElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}
