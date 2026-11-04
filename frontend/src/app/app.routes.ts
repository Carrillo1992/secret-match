import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'SecretMatch',
    loadComponent: () =>
      import('./features/landing/pages/landing-page/landing-page').then((m) => m.LandingPage),
  },
  { path: '**', redirectTo: '' },
];
