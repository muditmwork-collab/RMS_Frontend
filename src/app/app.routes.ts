import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { CareerComponent } from './pages/career/career.component';
import { HrPanelComponent } from './pages/hr-panel/hr-panel.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'career', component: CareerComponent },
  { path: 'hr-panel', component: HrPanelComponent },
  { path: '**', redirectTo: '' }
];
