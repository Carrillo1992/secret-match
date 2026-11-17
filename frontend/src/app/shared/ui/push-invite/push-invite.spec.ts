import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PushInvite, PushInviteState } from './push-invite';

@Component({
  imports: [PushInvite],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 id="card-heading" tabindex="-1">Sorteo</h2>
    <app-push-invite
      [about]="about()"
      [state]="state()"
      returnFocusTo="card-heading"
      (turnOn)="turnedOn = turnedOn + 1"
      (dismiss)="dismissed = dismissed + 1"
    />
  `,
})
class Host {
  readonly about = signal<'draw' | 'mailbox'>('draw');
  readonly state = signal<PushInviteState>('visible');
  turnedOn = 0;
  dismissed = 0;
}

describe('PushInvite', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let host: Host;
  let page: HTMLElement;

  beforeAll(() => import('@lucide/angular'), 90_000);

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    page = fixture.nativeElement as HTMLElement;
    document.body.appendChild(page);
    await fixture.whenStable();
  });

  afterEach(() => page.remove());

  const button = (name: string) =>
    Array.from(page.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === name || b.getAttribute('aria-label') === name,
    );
  const showing = async (state: PushInviteState) => {
    host.state.set(state);
    await fixture.whenStable();
  };

  it('says what it would tell about, and offers to turn notifications on', async () => {
    expect(page.textContent).toContain('Avísame aquí cuando se haga el sorteo');

    host.about.set('mailbox');
    await fixture.whenStable();
    expect(page.textContent).toContain('Avísame aquí cuando te escriban');

    button('Activar avisos')?.click();
    expect(host.turnedOn).toBe(1);
  });

  it("offers it with a secondary button, so it never competes with the card's own action", () => {
    expect(button('Activar avisos')?.getAttribute('appButton')).toBe('secondary');
  });

  it('"Ahora no" dismisses it and moves focus to the card\'s heading', () => {
    button('Ahora no')?.click();

    expect(host.dismissed).toBe(1);
    expect(document.activeElement?.id).toBe('card-heading');
  });

  it('holds the button while turning on', async () => {
    await showing('working');

    const working = button('Activando…');
    expect(working?.disabled).toBe(true);
    expect(button('Activar avisos')).toBeUndefined();
  });

  it('says it worked, politely, once notifications are on', async () => {
    await showing('done');

    expect(page.querySelector('[aria-live="polite"]')?.textContent).toContain(
      'Te avisaremos en este dispositivo.',
    );
    expect(button('Activar avisos')).toBeUndefined();
  });

  it('says where to undo a block, without offering again', async () => {
    await showing('denied');

    expect(page.textContent).toContain('Puedes activarlos en los ajustes del sitio.');
    expect(button('Activar avisos')).toBeUndefined();
  });

  it('keeps the offer with an alert when turning on failed', async () => {
    await showing('failed');

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'No hemos podido activar los avisos',
    );
    expect(button('Activar avisos')?.disabled).toBe(false);
  });
});
