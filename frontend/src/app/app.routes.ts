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
  { path: '**', redirectTo: '' },
];
