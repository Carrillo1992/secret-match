import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'SecretMatch',
    loadComponent: () =>
      import('./features/landing/pages/landing-page/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'sign-up',
    title: 'Crear cuenta · SecretMatch',
    loadComponent: () =>
      import('./features/auth/pages/sign-up-page/sign-up-page').then((m) => m.SignUpPage),
  },
  {
    path: 'check-email',
    title: 'Revisa tu correo · SecretMatch',
    loadComponent: () =>
      import('./features/auth/pages/check-email-page/check-email-page').then(
        (m) => m.CheckEmailPage,
      ),
  },
  {
    // The link in the verification email (built by the API's sign-up use case).
    path: 'verify-email',
    title: 'Confirmar correo · SecretMatch',
    loadComponent: () =>
      import('./features/auth/pages/verify-email-page/verify-email-page').then(
        (m) => m.VerifyEmailPage,
      ),
  },
  {
    path: 'sign-in',
    title: 'Iniciar sesión · SecretMatch',
    loadComponent: () =>
      import('./features/auth/pages/sign-in-page/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: 'forgot-password',
    title: 'Recuperar contraseña · SecretMatch',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password-page/forgot-password-page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    // The link in the Password Reset email (built by the API's forgotten-password use case).
    path: 'reset-password',
    title: 'Nueva contraseña · SecretMatch',
    loadComponent: () =>
      import('./features/auth/pages/reset-password-page/reset-password-page').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    path: 'home',
    title: 'Mis grupos · SecretMatch',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/pages/my-groups-page/my-groups-page').then((m) => m.MyGroupsPage),
  },
  {
    path: 'groups/new',
    title: 'Nuevo grupo · SecretMatch',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/pages/new-group-page/new-group-page').then((m) => m.NewGroupPage),
  },
  {
    path: 'groups/:groupId',
    title: 'Grupo · SecretMatch',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/pages/group-page/group-page').then((m) => m.GroupPage),
  },
  {
    path: 'profile',
    title: 'Tu perfil · SecretMatch',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/pages/profile-page/profile-page').then((m) => m.ProfilePage),
  },
  {
    // The Invite Link. Not guarded: a signed-out visitor is invited to sign up or sign in first.
    path: 'join/:code',
    title: 'Únete al grupo · SecretMatch',
    loadComponent: () =>
      import('./features/groups/pages/join-page/join-page').then((m) => m.JoinPage),
  },
  { path: '**', redirectTo: '' },
];
