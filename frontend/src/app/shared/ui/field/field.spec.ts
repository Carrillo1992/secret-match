import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Field } from './field';

@Component({
  imports: [Field],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label for="email">Correo</label><input id="email" appField class="w-full" />`,
})
class Host {}

describe('Field', () => {
  let input: HTMLInputElement | null;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    input = (fixture.nativeElement as HTMLElement).querySelector('input');
    await fixture.whenStable();
  });

  it('is a tall, rounded text input on the field background', () => {
    expect(input?.classList).toContain('bg-field');
    expect(input?.classList).toContain('rounded-field');
    expect(input?.classList).toContain('h-13');
  });

  it('turns its border to danger when marked invalid', () => {
    expect(input?.classList).toContain('aria-invalid:border-danger');
  });

  it('keeps the classes the screen adds', () => {
    expect(input?.classList).toContain('w-full');
  });
});

@Component({
  imports: [Field],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label for="who">Quién</label
    ><select id="who" appField>
      <option>Luis</option>
    </select>`,
})
class SelectHost {}

describe('Field on a select', () => {
  it('looks like a text input', async () => {
    const fixture = TestBed.createComponent(SelectHost);
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select');

    expect(select?.classList).toContain('bg-field');
    expect(select?.classList).toContain('rounded-field');
  });
});
