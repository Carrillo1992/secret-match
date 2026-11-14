import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChoiceOption, ChoiceRows } from './choice-rows';

type Fruit = 'apple' | 'pear' | 'fig';

@Component({
  imports: [ChoiceRows],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-choice-rows
      label="Fruta"
      [options]="options"
      [selected]="selected()"
      (chosen)="chosen.push($event); selected.set($event)"
    />
  `,
})
class Host {
  readonly options: ChoiceOption<Fruit>[] = [
    { value: 'apple', label: 'Manzana' },
    { value: 'pear', label: 'Pera' },
    { value: 'fig', label: 'Fig', lang: 'en' },
  ];
  readonly selected = signal<Fruit>('pear');
  readonly chosen: Fruit[] = [];
}

describe('ChoiceRows', () => {
  let host: Host;
  let page: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    page = fixture.nativeElement as HTMLElement;
    document.body.appendChild(page);
    await fixture.whenStable();
  });

  afterEach(() => page.remove());

  const group = () => page.querySelector<HTMLElement>('[role="radiogroup"]');
  const rows = () => Array.from(page.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const row = (label: string) => rows().find((r) => r.textContent?.includes(label));
  const press = (target: HTMLElement, key: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  it('is one radio group named by its label', () => {
    const labelId = group()?.getAttribute('aria-labelledby') ?? '';

    expect(document.getElementById(labelId)?.textContent).toContain('Fruta');
    expect(rows().map((r) => r.textContent?.trim())).toEqual(['Manzana', 'Pera', 'Fig']);
  });

  it('marks only the selected row as checked', () => {
    expect(row('Pera')?.getAttribute('aria-checked')).toBe('true');
    expect(row('Manzana')?.getAttribute('aria-checked')).toBe('false');
  });

  it('puts only the selected row in the tab order', () => {
    expect(rows().map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('writes a row in its own language when it has one', () => {
    expect(row('Fig')?.querySelector('[lang="en"]')).not.toBeNull();
  });

  it('chooses a row when it is activated', async () => {
    row('Fig')?.click();
    await fixture.whenStable();

    expect(host.chosen).toEqual(['fig']);
    expect(row('Fig')?.getAttribute('aria-checked')).toBe('true');
  });

  it('does nothing when the selected row is activated again', () => {
    row('Pera')?.click();

    expect(host.chosen).toEqual([]);
  });

  it('moves focus with the arrow keys without choosing anything', () => {
    row('Pera')?.focus();

    press(row('Pera') as HTMLElement, 'ArrowDown');
    expect(document.activeElement).toBe(row('Fig'));

    press(row('Fig') as HTMLElement, 'ArrowRight');
    expect(document.activeElement).toBe(row('Manzana'));

    press(row('Manzana') as HTMLElement, 'ArrowUp');
    expect(document.activeElement).toBe(row('Fig'));

    press(row('Fig') as HTMLElement, 'ArrowLeft');
    expect(document.activeElement).toBe(row('Pera'));

    expect(host.chosen).toEqual([]);
    expect(row('Pera')?.getAttribute('aria-checked')).toBe('true');
  });

  it('jumps to the first and last rows with Home and End', () => {
    row('Pera')?.focus();

    press(row('Pera') as HTMLElement, 'End');
    expect(document.activeElement).toBe(row('Fig'));

    press(row('Fig') as HTMLElement, 'Home');
    expect(document.activeElement).toBe(row('Manzana'));
    expect(host.chosen).toEqual([]);
  });
});
