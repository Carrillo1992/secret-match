import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { HOME_SEGMENT, SIGN_IN_SEGMENT } from './core/route-paths';

export const routes: Routes = [
  {
    path: '',
    title: $localize`SecretMatch · Tu amigo invisible, sin papelitos`,
    loadComponent: () =>
      import('./features/landing/pages/landing-page/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'sign-up',
    title: $localize`Crear cuenta · SecretMatch`,
    loadComponent: () =>
      import('./features/auth/pages/sign-up-page/sign-up-page').then((m) => m.SignUpPage),
  },
  {
    path: 'check-email',
    title: $localize`Revisa tu correo · SecretMatch`,
    loadComponent: () =>
      import('./features/auth/pages/check-email-page/check-email-page').then(
        (m) => m.CheckEmailPage,
      ),
  },
  {
    // The link in the verification email (built by the API's sign-up use case).
    path: 'verify-email',
    title: $localize`Confirmar correo · SecretMatch`,
    loadComponent: () =>
      import('./features/auth/pages/verify-email-page/verify-email-page').then(
        (m) => m.VerifyEmailPage,
      ),
  },
  {
    path: SIGN_IN_SEGMENT,
    title: $localize`Iniciar sesión · SecretMatch`,
    loadComponent: () =>
      import('./features/auth/pages/sign-in-page/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: 'forgot-password',
    title: $localize`Recuperar contraseña · SecretMatch`,
    loadComponent: () =>
      import('./features/auth/pages/forgot-password-page/forgot-password-page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    // The link in the Password Reset email (built by the API's `PasswordResetting` use case).
    path: 'reset-password',
    title: $localize`Nueva contraseña · SecretMatch`,
    loadComponent: () =>
      import('./features/auth/pages/reset-password-page/reset-password-page').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    path: HOME_SEGMENT,
    title: $localize`Mis grupos · SecretMatch`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/pages/my-groups-page/my-groups-page').then((m) => m.MyGroupsPage),
  },
  {
    path: 'groups/new',
    title: $localize`Nuevo grupo · SecretMatch`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/pages/new-group-page/new-group-page').then((m) => m.NewGroupPage),
  },
  {
    path: 'groups/:groupId',
    title: $localize`Grupo · SecretMatch`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/pages/group-page/group-page').then((m) => m.GroupPage),
  },
  {
    path: 'groups/:groupId/members/:memberId/wishlist',
    title: $localize`Lista de deseos · SecretMatch`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/wishlist/pages/wishlist-page/wishlist-page').then((m) => m.WishlistPage),
  },
  {
    path: 'profile',
    title: $localize`Tu perfil · SecretMatch`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/pages/profile-page/profile-page').then((m) => m.ProfilePage),
  },
  {
    // The Invite Link. Not guarded: a signed-out visitor is invited to sign up or sign in first.
    path: 'join/:code',
    title: $localize`Únete al grupo · SecretMatch`,
    loadComponent: () =>
      import('./features/groups/pages/join-page/join-page').then((m) => m.JoinPage),
  },
  { path: '**', redirectTo: '' },
];
