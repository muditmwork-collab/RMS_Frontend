import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';

declare const $: any;

@Component({
  selector: 'app-candidate-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-data.component.html',
  styleUrls: ['./candidate-data.component.css']
})
export class CandidateDataComponent implements OnInit {
  loading = true;
  saving = false;
  isEditing = false;
  error = '';
  candidateId = '';

  profile: any = {
    candidate_id: '',
    name: '',
    email: '',
    phone: '',
    skills: '',
    experience: '',
    education: '',
    resume_path: '',
    source: '',
    ready_to_relocate: '',
    notice_period: '',
    expected_salary: '',
    linkedin_url: '',
    has_referral: '',
    referral_id: '',
    created_at: '',
    created_by: ''
  };

  constructor(private heroService: HeroService) {
    this.candidateId = sessionStorage.getItem('candidate_id') || '';
  }

  ngOnInit(): void {
    if (!this.candidateId) {
      this.error = 'You must be logged in to view your profile.';
      this.loading = false;
      return;
    }
    this.loadCandidateData();
  }

  loadCandidateData(): void {
    this.loading = true;
    this.error = '';

    this.heroService.getCandidateObject(this.candidateId)
      .then((response: any) => {
        console.log(`[CandidateData] Response for ID ${this.candidateId}:`, response);
        try {
          const candidate = this.heroService.xmltojson(response, 'candidate');
          if (candidate) {
            this.profile = {
              candidate_id: candidate.candidate_id || '',
              name: candidate.name || '',
              email: candidate.email || '',
              phone: candidate.phone || '',
              skills: candidate.skills || '',
              experience: candidate.experience || '0',
              education: candidate.education || '',
              resume_path: candidate.resume_path || '',
              source: candidate.source || '',
              ready_to_relocate: String(candidate.ready_to_relocate) === 'true',
              notice_period: candidate.notice_period || '0',
              expected_salary: candidate.expected_salary || '0',
              linkedin_url: candidate.linkedin_url || '',
              has_referral: String(candidate.has_referral) === 'true',
              referral_id: candidate.referral_id || '',
              created_at: candidate.created_at || '',
              created_by: candidate.created_by || ''
            };
          } else {
            console.warn(`[CandidateData] No candidate node found in response for ID: ${this.candidateId}`);
            this.error = `No profile data found for your account (ID: ${this.candidateId}). Please complete your profile.`;
          }
        } catch (e) {
          console.error('[CandidateData] Error parsing response:', e);
          this.error = 'Unable to parse profile data.';
        }
        this.loading = false;
      }).catch((err: any) => {
        console.error(`[CandidateData] AJAX Error for ID ${this.candidateId}:`, err);
        this.error = `Connection error while fetching profile (ID: ${this.candidateId}).`;
        this.loading = false;
      });
  }

  getInitials(): string {
    if (!this.profile.name) return 'C';
    const parts = this.profile.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }

  toggleEdit(): void {
    if (this.isEditing) {
      // Cancel edit: revert changes by reloading from server
      this.isEditing = false;
      this.loadCandidateData();
    } else {
      this.isEditing = true;
    }
  }

  onSave(): void {
    if (this.saving || !this.isEditing) return;
    this.saving = true;
    this.error = '';

    const updatedFields: any = {
      email: this.profile.email,
      phone: this.profile.phone,
      skills: this.profile.skills,
      experience: this.profile.experience,
      education: this.profile.education,
      expected_salary: this.profile.expected_salary,
      name: this.profile.name,
      source: this.profile.source,
      ready_to_relocate: this.profile.ready_to_relocate,
      notice_period: this.profile.notice_period,
      linkedin_url: this.profile.linkedin_url
    };

    this.heroService.updateCandidate(this.profile.candidate_id, updatedFields)
      .then((response: any) => {
        this.saving = false;
        this.isEditing = false;
        this.loadCandidateData();
      }).catch((err: any) => {
        console.error('Error saving candidate data:', err);
        this.error = 'Failed to save candidate data. Please try again.';
        this.saving = false;
      });
  }
}
