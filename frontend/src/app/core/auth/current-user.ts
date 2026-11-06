import { computed, inject, Injectable, resource } from '@angular/core';
import { Api } from '../api/generated/api';
import { currentUser } from '../api/generated/functions';

/** The signed-in User, loaded once when the service is created. Provide it at the page. */
@Injectable()
export class CurrentUser {
  private readonly api = inject(Api);
  private readonly user = resource({ loader: () => this.api.invoke(currentUser) });

  /** `undefined` while loading or after a failure: reading a failed resource's value throws. */
  readonly value = computed(() => (this.user.hasValue() ? this.user.value() : undefined));
  readonly isLoading = this.user.isLoading;

  reload(): void {
    this.user.reload();
  }
}
