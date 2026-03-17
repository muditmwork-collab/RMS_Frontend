import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { CareerComponent } from './pages/career/career.component';
import { LeadershipDashboardComponent } from './pages/leadership-dashboard/leadership-dashboard.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'career', component: CareerComponent },
  { path: 'leadership-dashboard', component: LeadershipDashboardComponent },
  { path: '**', redirectTo: '' }
];
