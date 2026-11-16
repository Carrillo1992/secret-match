// PROTOTYPE (#118), throwaway: the three iOS steps in each variant's look.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideCheck, LucideEllipsis, LucideShare, LucideSquarePlus } from '@lucide/angular';

/** `well`: A's numbered list in a canvas well. `rows`: B's choice-rows look. `numbered`: C's badges. */
export type GuideLook = 'well' | 'rows' | 'numbered';

@Component({
  selector: 'app-proto-ios-guide-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCheck, LucideEllipsis, LucideShare, LucideSquarePlus, NgTemplateOutlet],
  host: { class: 'block' },
  template: `
    <ng-template #step1>
      Pulsa <strong>Compartir</strong>
      <svg lucideShare [size]="18" class="inline-block align-[-3px] text-primary"></svg> en la barra
      del navegador (si no lo ves, pulsa antes
      <svg lucideEllipsis [size]="18" class="inline-block align-[-4px]"></svg
      ><span class="sr-only">···</span>).
    </ng-template>
    <ng-template #step2>
      Elige <strong>«Añadir a pantalla de inicio»</strong>
      <svg lucideSquarePlus [size]="18" class="inline-block align-[-3px] text-primary"></svg>.
    </ng-template>
    <ng-template #step3>Pulsa <strong>«Añadir»</strong>.</ng-template>

    @switch (look()) {
      @case ('well') {
        <ol class="mt-3 flex list-decimal flex-col gap-2.5 pl-5 marker:font-bold">
          <li><ng-container [ngTemplateOutlet]="step1" /></li>
          <li><ng-container [ngTemplateOutlet]="step2" /></li>
          <li><ng-container [ngTemplateOutlet]="step3" /></li>
        </ol>
      }
      @case ('rows') {
        <ol class="mt-5 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas">
          <li class="flex min-h-13 items-center gap-3 px-4 py-3">
            <svg lucideShare [size]="20" class="shrink-0 text-primary"></svg>
            <span>
              <span class="sr-only">1. </span>Pulsa <strong>Compartir</strong> en la barra del
              navegador (si no lo ves, pulsa antes
              <svg lucideEllipsis [size]="18" class="inline-block align-[-4px]"></svg
              ><span class="sr-only">···</span>).
            </span>
          </li>
          <li class="flex min-h-13 items-center gap-3 px-4 py-3">
            <svg lucideSquarePlus [size]="20" class="shrink-0 text-primary"></svg>
            <span
              ><span class="sr-only">2. </span>Elige
              <strong>«Añadir a pantalla de inicio»</strong>.</span
            >
          </li>
          <li class="flex min-h-13 items-center gap-3 px-4 py-3">
            <svg lucideCheck [size]="20" class="shrink-0 text-primary"></svg>
            <span><span class="sr-only">3. </span>Pulsa <strong>«Añadir»</strong>.</span>
          </li>
        </ol>
      }
      @case ('numbered') {
        <ol class="mt-5 flex flex-col gap-4">
          @for (n of [1, 2, 3]; track n) {
            <li class="flex items-start gap-3">
              <span
                aria-hidden="true"
                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-on-primary"
                >{{ n }}</span
              >
              <span class="pt-1.5">
                <span class="sr-only">{{ n }}. </span>
                @if (n === 1) {
                  <ng-container [ngTemplateOutlet]="step1" />
                } @else if (n === 2) {
                  <ng-container [ngTemplateOutlet]="step2" />
                } @else {
                  <ng-container [ngTemplateOutlet]="step3" />
                }
              </span>
            </li>
          }
        </ol>
      }
    }
  `,
})
export class ProtoIosGuideSteps {
  readonly look = input.required<GuideLook>();
}
