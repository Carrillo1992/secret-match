import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucideTrash2 } from '@lucide/angular';
import { AuthSession } from '../../../../core/auth/auth-session';
import { CurrentUser } from '../../../../core/auth/current-user';
import { Alert } from '../../../../shared/ui/alert/alert';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { USER_RULES } from '../../../../core/auth/user-rules';
import { maxUtf8Bytes, notBlank } from '../../../../shared/forms/validators';
import { DeleteAccountOutcome, Me, ProfileApi } from '../../data-access/profile-api';

type FormState = 'idle' | 'sending' | 'saved' | 'failed';
/** `created`: a User who had no password (Google only) set their first one. */
type PasswordState = FormState | 'wrong-password' | 'created';
type DeleteState = 'idle' | 'confirming' | 'deleting' | Exclude<DeleteAccountOutcome, 'deleted'>;

/**
 * "Tu perfil": the signed-in User changes their display name and their password, and can delete
 * their account after confirming it in a dialog.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    AppShell,
    Button,
    ConfirmDialog,
    Field,
    ReactiveFormsModule,
    RouterLink,
    TextLink,
    LucideChevronLeft,
    LucideTrash2,
  ],
  templateUrl: './profile-page.html',
  providers: [CurrentUser],
})
export class ProfilePage {
  private readonly profileApi = inject(ProfileApi);
  private readonly forms = inject(NonNullableFormBuilder);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly user = inject(CurrentUser);
  private readonly saved = signal<Me | undefined>(undefined);
  /** The User as last loaded or saved; `undefined` while loading or after a failure. */
  protected readonly me = computed(() => this.saved() ?? this.user.value());
  protected readonly rules = USER_RULES;

  protected readonly nameForm = this.forms.group({
    displayName: [
      '',
      [Validators.required, notBlank, Validators.maxLength(USER_RULES.displayNameMaxLength)],
    ],
  });
  protected readonly nameSubmitted = signal(false);
  protected readonly nameState = signal<FormState>('idle');

  /** The current password is asked for only when there is one: off for a User who signs in with Google alone. */
  protected readonly passwordForm = this.forms.group({
    currentPassword: ['', Validators.required],
    newPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(USER_RULES.passwordMinLength),
        maxUtf8Bytes(USER_RULES.passwordMaxBytes),
      ],
    ],
  });
  protected readonly passwordSubmitted = signal(false);
  protected readonly passwordState = signal<PasswordState>('idle');
  protected readonly hasPassword = computed(() => this.me()?.hasPassword ?? true);

  protected readonly deleteState = signal<DeleteState>('idle');

  constructor() {
    effect(() => {
      const loaded = this.user.value();
      if (loaded) {
        untracked(() => this.nameForm.controls.displayName.setValue(loaded.displayName));
      }
    });
    effect(() => {
      const current = this.passwordForm.controls.currentPassword;
      if (this.hasPassword()) {
        current.enable();
      } else {
        current.disable();
      }
    });
  }

  protected showsError(control: AbstractControl, submitted: boolean): boolean {
    return control.invalid && (control.touched || submitted);
  }

  protected async saveDisplayName(): Promise<void> {
    this.nameSubmitted.set(true);
    if (this.nameForm.invalid || this.nameState() === 'sending') {
      return;
    }
    this.nameState.set('sending');
    const outcome = await this.profileApi.changeDisplayName(
      this.nameForm.getRawValue().displayName,
    );
    if (outcome.status === 'saved') {
      this.saved.set(outcome.me);
      this.nameForm.controls.displayName.setValue(outcome.me.displayName);
      this.nameState.set('saved');
    } else {
      this.nameState.set('failed');
    }
  }

  protected async changePassword(): Promise<void> {
    this.passwordSubmitted.set(true);
    if (this.passwordForm.invalid || this.passwordState() === 'sending') {
      return;
    }
    this.passwordState.set('sending');
    const hadPassword = this.hasPassword();
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    const outcome = await this.profileApi.changePassword(
      newPassword,
      hadPassword ? currentPassword : undefined,
    );
    if (outcome.status !== 'changed') {
      this.passwordState.set(outcome.status);
      return;
    }
    this.passwordForm.reset();
    this.passwordSubmitted.set(false);
    const me = this.me();
    if (me) {
      this.saved.set({ ...me, hasPassword: true });
    }
    this.passwordState.set(hadPassword ? 'saved' : 'created');
  }

  /** Once deleted, the session ends and the User lands on the landing page, which says it is done. */
  protected async deleteAccount(): Promise<void> {
    this.deleteState.set('deleting');
    const outcome = await this.profileApi.deleteAccount();
    if (outcome !== 'deleted') {
      this.deleteState.set(outcome);
      return;
    }
    await this.session.endDeletedSession();
    await this.router.navigateByUrl('/', { state: { accountDeleted: true } });
  }
}
