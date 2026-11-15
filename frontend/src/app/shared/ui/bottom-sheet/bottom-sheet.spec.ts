import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BottomSheet } from './bottom-sheet';

@Component({
  imports: [BottomSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-bottom-sheet heading="Preferencias" [open]="open()" (closed)="closings = closings + 1">
      <p id="content">Tema</p>
    </app-bottom-sheet>
  `,
})
class Host {
  readonly open = signal(false);
  closings = 0;
}

describe('BottomSheet', () => {
  let host: Host;
  let page: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const dialog = () => page.querySelector('dialog') as HTMLDialogElement;
  const openSheet = async () => {
    host.open.set(true);
    await fixture.whenStable();
  };

  it('stays closed until the host opens it', () => {
    expect(dialog().open).toBe(false);
  });

  it('opens as a dialog named by its heading, holding the content', async () => {
    await openSheet();

    const titleId = dialog().getAttribute('aria-labelledby') ?? '';
    expect(dialog().open).toBe(true);
    expect(page.querySelector(`#${titleId}`)?.textContent).toContain('Preferencias');
    expect(dialog().querySelector('#content')).not.toBeNull();
  });

  it('starts with focus on the sheet itself', async () => {
    document.body.appendChild(page);
    await openSheet();

    expect(document.activeElement).toBe(dialog());
    page.remove();
  });

  it('asks the host to close on Escape, without closing behind its back', async () => {
    await openSheet();

    const escape = new Event('cancel', { cancelable: true });
    dialog().dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(host.closings).toBe(1);
    expect(dialog().open).toBe(true);
  });

  it('asks the host to close from "Cerrar"', async () => {
    await openSheet();

    const close = Array.from(dialog().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cerrar',
    );
    close?.click();

    expect(host.closings).toBe(1);
  });

  it('asks the host to close on a click on the backdrop, not on the content', async () => {
    await openSheet();

    dialog().querySelector<HTMLElement>('#content')?.click();
    expect(host.closings).toBe(0);

    dialog().click();
    expect(host.closings).toBe(1);
  });

  it('closes when the host says so', async () => {
    await openSheet();

    host.open.set(false);
    await fixture.whenStable();

    expect(dialog().open).toBe(false);
  });
});
