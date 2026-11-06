import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideMailCheck } from '@lucide/angular';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { NewLinkButton } from '../../components/new-link-button/new-link-button';
import { NewVerificationLink } from '../../data-access/new-verification-link';
import { SIGN_UP_RULES } from '../../data-access/sign-up-rules';

/** After a sign-up, `/check-email?signUp=<id>`: "check your email", and a way to get a new link. */
@Component({
  selector: 'app-check-email-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NewLinkButton, RouterLink, SheetLayout, StatusHeader, TextLink, LucideMailCheck],
  templateUrl: './check-email-page.html',
  providers: [NewVerificationLink],
})
export class CheckEmailPage {
  protected readonly newLink = inject(NewVerificationLink);
  protected readonly rules = SIGN_UP_RULES;
  protected readonly signUpId = inject(ActivatedRoute).snapshot.queryParamMap.get('signUp') ?? '';
  /** Handed over by the sign-up page in the navigation state, so it is gone after a reload. */
  protected readonly email = emailFrom(inject(Location).getState());
}

function emailFrom(state: unknown): string {
  const email = (state as { email?: unknown } | null)?.email;
  return typeof email === 'string' ? email : '';
}
