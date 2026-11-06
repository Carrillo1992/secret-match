import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideCircleCheck,
  LucideClock,
  LucideLoaderCircle,
  LucideUnlink,
  LucideWifiOff,
} from '@lucide/angular';
import { Button } from '../../../../shared/ui/button/button';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { NewLinkButton } from '../../components/new-link-button/new-link-button';
import { NewVerificationLink } from '../../data-access/new-verification-link';
import { SignUpApi, VerifyEmailOutcome } from '../../data-access/sign-up-api';
import { SIGN_UP_RULES } from '../../data-access/sign-up-rules';

type VerifyEmailStatus = 'verifying' | VerifyEmailOutcome;

/** Where the link in the verification email lands: `/verify-email?token=…`. */
@Component({
  selector: 'app-verify-email-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NewLinkButton,
    RouterLink,
    SheetLayout,
    StatusHeader,
    Button,
    TextLink,
    LucideCircleCheck,
    LucideClock,
    LucideLoaderCircle,
    LucideUnlink,
    LucideWifiOff,
  ],
  templateUrl: './verify-email-page.html',
  providers: [NewVerificationLink],
})
export class VerifyEmailPage {
  private readonly signUpApi = inject(SignUpApi);
  private readonly token: string;

  protected readonly newLink = inject(NewVerificationLink);
  protected readonly rules = SIGN_UP_RULES;
  protected readonly status = signal<VerifyEmailStatus>('verifying');

  constructor() {
    const route = inject(ActivatedRoute);
    this.token = route.snapshot.queryParamMap.get('token') ?? '';
    // The page keeps the token in memory; the address bar and the history do not need it.
    void inject(Router).navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true });
    void this.verify();
  }

  protected async verify(): Promise<void> {
    if (this.token === '') {
      this.status.set('invalid');
      return;
    }
    this.status.set('verifying');
    this.status.set(await this.signUpApi.verifyEmail(this.token));
  }

  protected askNewLink(): Promise<void> {
    return this.newLink.inPlaceOf(this.token);
  }
}
