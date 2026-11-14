import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the Preferences menu chosen in #87 (option B): the icon button in the header that
 * opens a bottom sheet with the Theme and Language choices. To be built in #87; see the design
 * comment on the issue.
 */
@Component({
  selector: 'app-preferences-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class PreferencesMenu {}
