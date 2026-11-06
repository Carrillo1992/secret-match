import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The decorative gift scene at the top of sheet screens. Hidden from assistive technology. */
@Component({
  selector: 'app-gift-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <svg
      class="size-full"
      viewBox="0 0 390 290"
      preserveAspectRatio="xMidYMax meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="318" cy="96" r="72" class="fill-mustard" />
      <ellipse cx="60" cy="236" rx="110" ry="70" class="fill-sage" />
      <circle cx="96" cy="118" r="7" class="fill-primary" />
      <circle cx="300" cy="236" r="5" class="fill-primary" />
      <circle cx="268" cy="176" r="9" class="fill-clay" />
      <g class="motion-safe:animate-bob">
        <rect x="140" y="136" width="110" height="92" rx="16" class="fill-primary" />
        <rect x="130" y="112" width="130" height="34" rx="12" class="fill-clay" />
        <rect x="187" y="112" width="16" height="116" class="fill-mustard" />
        <path
          d="M195 112 C 178 84, 150 92, 166 108 C 172 113, 186 113, 195 112 Z"
          class="fill-none stroke-mustard"
          stroke-width="8"
          stroke-linejoin="round"
        />
        <path
          d="M195 112 C 212 84, 240 92, 224 108 C 218 113, 204 113, 195 112 Z"
          class="fill-none stroke-mustard"
          stroke-width="8"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  `,
})
export class GiftIllustration {}
