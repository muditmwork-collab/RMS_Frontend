import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateDetailService, CandidateProfile, InterviewRound, OfferRecord } from './candidate-detail.service';

export type CandidateDetailTab = 'overview' | 'applications' | 'interviews' | 'offers' | 'notes';

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-detail.component.html',
  styleUrls: ['./candidate-detail.component.css']
})
export class CandidateDetailComponent implements OnInit, OnChanges {
  @Input() candidateId: string = '';
  @Input() jrId?: string = '';
  @Input() role: 'HR' | 'Leadership' = 'HR';
  @Input() visible: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() action = new EventEmitter<{ type: string; data: any }>();

  activeTab: CandidateDetailTab = 'overview';
  profile: CandidateProfile | null = null;
  loading: boolean = false;
  error: string | null = null;
  isDownloadingResume: boolean = false;

  // Selected filter for application/interview drilldown
  selectedJobFilter: string = '';

  // Toast / notification
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast: boolean = false;

  constructor(private candidateDetailService: CandidateDetailService) {}

  ngOnInit(): void {
    if (this.visible && this.candidateId) {
      this.loadProfile();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['candidateId'] && this.candidateId) {
      if (this.visible) {
        this.loadProfile();
      }
    } else if (changes['visible'] && this.visible && this.candidateId && !this.profile) {
      this.loadProfile();
    }
  }

  async loadProfile(): Promise<void> {
    if (!this.candidateId) return;
    this.loading = true;
    this.error = null;
    try {
      this.profile = await this.candidateDetailService.loadCandidateProfile(this.candidateId);
      if (this.jrId) {
        this.selectedJobFilter = this.jrId;
      }
    } catch (err: any) {
      console.error('[CandidateDetail] Failed to load candidate profile:', err);
      this.error = 'Unable to load candidate details. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  setTab(tab: CandidateDetailTab): void {
    this.activeTab = tab;
  }

  closeModal(): void {
    this.close.emit();
  }

  async viewResume(): Promise<void> {
    if (!this.profile?.resumePath) {
      this.displayToast('No resume file found for this candidate.', 'info');
      return;
    }
    this.isDownloadingResume = true;
    try {
      await this.candidateDetailService.viewResume(this.profile.resumePath);
      this.displayToast('Opening resume...', 'success');
    } catch (err: any) {
      console.error('[CandidateDetail] Failed to view resume:', err);
      this.displayToast('Failed to view resume file.', 'error');
    } finally {
      this.isDownloadingResume = false;
    }
  }

  triggerAction(type: string, extraData?: any): void {
    this.action.emit({
      type,
      data: {
        candidateId: this.candidateId,
        candidateName: this.profile?.name || '',
        candidateEmail: this.profile?.email || '',
        jrId: this.jrId,
        profile: this.profile,
        extra: extraData
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'CD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getStarArray(rating: number | string): number[] {
    const r = typeof rating === 'number' ? rating : parseFloat(rating) || 0;
    const full = Math.min(5, Math.max(0, Math.round(r)));
    return Array(full).fill(0);
  }

  getStatusClass(status: string): string {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'SELECTED':
      case 'OFFERED':
      case 'APPROVED':
      case 'HIRED':
      case 'ACCEPTED':
        return 'badge-success';
      case 'SHORTLISTED':
      case 'INTERVIEWING':
      case 'SCREENED':
      case 'IN_PROGRESS':
        return 'badge-info';
      case 'REJECTED':
      case 'DECLINED':
      case 'PAUSED':
        return 'badge-danger';
      case 'APPLIED':
      case 'PENDING':
      default:
        return 'badge-warning';
    }
  }

  displayToast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3500);
  }
}
