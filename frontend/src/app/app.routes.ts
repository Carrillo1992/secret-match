import { Routes } from '@angular/router';

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
  { path: '**', redirectTo: '' },
];
