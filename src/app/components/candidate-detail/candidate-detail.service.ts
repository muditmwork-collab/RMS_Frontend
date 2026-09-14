import { Injectable } from '@angular/core';
import { HeroService } from '../../hero.service';

export interface CandidateProfile {
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string | number;
  education: string;
  linkedinUrl: string;
  resumePath: string;
  source: string;
  currentRole?: string;
  department?: string;
  appliedDate?: string;
  // Aggregated details
  applications: CandidateApplication[];
  interviewHistory: InterviewRound[];
  referral: ReferralInfo | null;
  offers: OfferRecord[];
}

export interface CandidateApplication {
  applicationId: string;
  jrId: string;
  jobTitle: string;
  department: string;
  applicationStatus: string;
  stage: string;
  appliedDate: string;
  expectedSalary: string;
  preferredLocation: string;
  raw?: any;
}

export interface InterviewRound {
  interviewId: string;
  jrId: string;
  jobTitle: string;
  round: string;
  scheduledDate: string;
  scheduledTime: string;
  meetingLink: string;
  status: string;
  avgScore: number | string;
  panels: PanelFeedback[];
}

export interface PanelFeedback {
  panelId: string;
  interviewerId: string;
  interviewerName: string;
  feedback: string;
  rating: number;
  technicalSkills: string;
  communicationSkills: string;
  culturalFit: string;
  anotherInterviewRequired: string;
}

export interface ReferralInfo {
  referralId: string;
  referringEmployeeId: string;
  referringEmployeeName: string;
  referralStatus: string;
  relationship?: string;
  notes?: string;
}

export interface OfferRecord {
  offerId: string;
  jrId: string;
  jobTitle: string;
  salaryOffered: string;
  offerDate: string;
  dateOfJoining: string;
  offerStatus: string;
  approvalStatus: string;
  leadershipRemarks: string;
  raw?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CandidateDetailService {

  constructor(private heroService: HeroService) {}

  // ─── XML / SOAP Helpers ───
  private ext(field: any): string {
    if (field === null || field === undefined) return '';
    if (typeof field === 'string') return field.trim();
    if (typeof field === 'number') return String(field);
    if (field.text !== undefined) return String(field.text).trim();
    if (field['#text'] !== undefined) return String(field['#text']).trim();
    return '';
  }

  private extractTuples(response: any, entityKey?: string): any[] {
    if (!response) return [];
    let tuples = this.heroService.xmltojson(response, 'tuple');
    if (!tuples && entityKey) {
      tuples = this.heroService.xmltojson(response, entityKey);
    }
    if (!tuples) return [];
    const arr = Array.isArray(tuples) ? tuples : [tuples];
    return arr.map(t => {
      if (entityKey && (t?.old?.[entityKey] || t?.new?.[entityKey] || t?.[entityKey])) {
        return t?.old?.[entityKey] || t?.new?.[entityKey] || t?.[entityKey];
      }
      return t?.old || t?.new || t;
    }).filter(item => item !== null && item !== undefined);
  }

  private flattenRecord(record: any): any {
    if (!record || typeof record !== 'object') return {};
    const result: any = {};
    for (const key of Object.keys(record)) {
      result[key] = this.ext(record[key]);
    }
    return result;
  }

  /**
   * Loads the complete candidate profile by querying all related services in parallel.
   */
  async loadCandidateProfile(candidateId: string): Promise<CandidateProfile> {
    const cId = (candidateId || '').trim();

    // Fetch all related entities in parallel with fault-tolerance
    const [
      candidatesResp,
      jobsResp,
      appsResp,
      interviewsResp,
      panelsResp,
      offersResp,
      referralsResp,
      employeesResp
    ] = await Promise.allSettled([
      this.heroService.getCandidates(),
      this.heroService.getJobRequisitions(),
      this.heroService.getCandidateApplications(),
      this.heroService.getInterviews(),
      this.heroService.getInterviewPanels(),
      this.heroService.getOffers(),
      this.heroService.getEmployeeReferrals(),
      this.heroService.getEmployees()
    ]);

    // 1. Employee lookup map for names
    const employeeMap = new Map<string, string>();
    if (employeesResp.status === 'fulfilled' && employeesResp.value) {
      const empTuples = this.extractTuples(employeesResp.value, 'employee');
      empTuples.forEach(e => {
        const flat = this.flattenRecord(e);
        const empId = flat.employee_id || flat.id;
        const empName = flat.name || flat.full_name || flat.employee_name || empId;
        if (empId) employeeMap.set(empId.toLowerCase(), empName);
      });
    }

    // 2. Job Requisition lookup map
    const jobMap = new Map<string, { title: string; department: string; location: string }>();
    if (jobsResp.status === 'fulfilled' && jobsResp.value) {
      const jobTuples = this.extractTuples(jobsResp.value, 'job_requisition');
      jobTuples.forEach(j => {
        const flat = this.flattenRecord(j);
        const jrId = flat.jr_id || flat.requisition_id || flat.id;
        if (jrId) {
          jobMap.set(jrId.toLowerCase(), {
            title: flat.job_title || flat.title || jrId,
            department: flat.department || '',
            location: flat.location || ''
          });
        }
      });
    }

    // 3. Find Candidate record
    let candidateData: any = null;
    if (candidatesResp.status === 'fulfilled' && candidatesResp.value) {
      const candTuples = this.extractTuples(candidatesResp.value, 'candidate');
      candidateData = candTuples
        .map(c => this.flattenRecord(c))
        .find(c => (c.candidate_id || c.id || '').toLowerCase() === cId.toLowerCase());
    }

    // Fallback: If not found in batch list, try fetching single candidate
    if (!candidateData) {
      try {
        const singleResp = await this.heroService.getCandidateObject(cId);
        if (singleResp) {
          const singleTuple = this.extractTuples(singleResp, 'candidate');
          if (singleTuple.length > 0) {
            candidateData = this.flattenRecord(singleTuple[0]);
          }
        }
      } catch (err) {
        console.warn('[CandidateDetailService] Direct candidate fetch fallback failed:', err);
      }
    }

    // 4. Candidate Applications
    const applications: CandidateApplication[] = [];
    if (appsResp.status === 'fulfilled' && appsResp.value) {
      const appTuples = this.extractTuples(appsResp.value, 'candidate_job_application');
      appTuples
        .map(a => this.flattenRecord(a))
        .filter(a => (a.candidate_id || '').toLowerCase() === cId.toLowerCase())
        .forEach(a => {
          const jrInfo = jobMap.get((a.jr_id || '').toLowerCase()) || { title: a.jr_id || 'Unknown Job', department: '', location: '' };
          applications.push({
            applicationId: a.application_id || '',
            jrId: a.jr_id || '',
            jobTitle: jrInfo.title,
            department: jrInfo.department,
            applicationStatus: a.application_status || 'APPLIED',
            stage: a.stage || a.application_status || 'applied',
            appliedDate: a.applied_date || a.applied_at || '',
            expectedSalary: a.expected_salary || a.salary_expectation || 'Not specified',
            preferredLocation: a.preferred_location || jrInfo.location || 'Flexible',
            raw: a
          });
        });
    }

    // 5. Interviews & Panel Feedback
    const interviewHistory: InterviewRound[] = [];
    if (interviewsResp.status === 'fulfilled' && interviewsResp.value) {
      const intTuples = this.extractTuples(interviewsResp.value, 'interview');
      const candidateInterviews = intTuples
        .map(i => this.flattenRecord(i))
        .filter(i => (i.candidate_id || '').toLowerCase() === cId.toLowerCase());

      // Parse panels
      const allPanels: any[] = [];
      if (panelsResp.status === 'fulfilled' && panelsResp.value) {
        const panTuples = this.extractTuples(panelsResp.value, 'interview_panel');
        panTuples.forEach(p => allPanels.push(this.flattenRecord(p)));
      }

      candidateInterviews.forEach(intRec => {
        const intId = intRec.interview_id;
        const matchingPanels = allPanels.filter(p => p.interview_id === intId);

        let totalScore = 0;
        let ratedCount = 0;

        const panelFeedbacks: PanelFeedback[] = matchingPanels.map(p => {
          const ratingNum = parseFloat(p.rating) || 0;
          if (ratingNum > 0) {
            totalScore += ratingNum;
            ratedCount++;
          }

          const interviewerId = (p.interviewer_id || '').toLowerCase();
          const interviewerName = p.interviewer_name || employeeMap.get(interviewerId) || p.interviewer_id || 'Interviewer';

          return {
            panelId: p.panel_id || '',
            interviewerId: p.interviewer_id || '',
            interviewerName,
            feedback: p.feedback || 'No comments provided',
            rating: ratingNum,
            technicalSkills: p.technical_skills || '',
            communicationSkills: p.communication_skills || '',
            culturalFit: p.cultural_fit || '',
            anotherInterviewRequired: p.another_interview_required || ''
          };
        });

        const avgScore = ratedCount > 0 ? (totalScore / ratedCount).toFixed(1) : 'Pending';
        const jrInfo = jobMap.get((intRec.jr_id || '').toLowerCase());

        interviewHistory.push({
          interviewId: intId,
          jrId: intRec.jr_id || '',
          jobTitle: jrInfo?.title || intRec.jr_id || 'Interview',
          round: intRec.round || 'Round 1',
          scheduledDate: intRec.scheduled_date || intRec.interview_date || '',
          scheduledTime: intRec.scheduled_time || intRec.interview_time || '',
          meetingLink: intRec.teams_link || intRec.meeting_link || '',
          status: intRec.status || 'SCHEDULED',
          avgScore,
          panels: panelFeedbacks
        });
      });

      // Sort interviews chronologically or by round
      interviewHistory.sort((a, b) => {
        const roundA = parseInt((a.round || '').replace(/\D/g, '')) || 0;
        const roundB = parseInt((b.round || '').replace(/\D/g, '')) || 0;
        return roundA - roundB;
      });
    }

    // 6. Offers
    const offers: OfferRecord[] = [];
    if (offersResp.status === 'fulfilled' && offersResp.value) {
      const offerTuples = this.extractTuples(offersResp.value, 'offer');
      offerTuples
        .map(o => this.flattenRecord(o))
        .filter(o => (o.candidate_id || '').toLowerCase() === cId.toLowerCase())
        .forEach(o => {
          const jrInfo = jobMap.get((o.jr_id || '').toLowerCase());
          offers.push({
            offerId: o.offer_id || '',
            jrId: o.jr_id || '',
            jobTitle: o.job_title || jrInfo?.title || o.jr_id || 'Job Offer',
            salaryOffered: o.salary_offered || o.ctc || 'N/A',
            offerDate: o.offer_date || o.created_at || '',
            dateOfJoining: o.date_of_joining || o.joining_date || '',
            offerStatus: o.offer_status || o.status || 'Pending',
            approvalStatus: o.approval_status || o.status || 'PENDING',
            leadershipRemarks: o.leadership_remarks || o.temp1 || o.remarks || '',
            raw: o
          });
        });
    }

    // 7. Referral Info
    let referral: ReferralInfo | null = null;
    if (referralsResp.status === 'fulfilled' && referralsResp.value) {
      const refTuples = this.extractTuples(referralsResp.value, 'employee_referral');
      const candRef = refTuples
        .map(r => this.flattenRecord(r))
        .find(r => (r.candidate_id || '').toLowerCase() === cId.toLowerCase());

      if (candRef) {
        const empId = (candRef.employee_id || candRef.referring_employee_id || '').toLowerCase();
        const empName = candRef.employee_name || employeeMap.get(empId) || empId || 'Employee Referral';
        referral = {
          referralId: candRef.referral_id || '',
          referringEmployeeId: empId,
          referringEmployeeName: empName,
          referralStatus: candRef.referral_status || candRef.status || 'Referred',
          relationship: candRef.relationship || candRef.temp1 || '',
          notes: candRef.remarks || candRef.notes || ''
        };
      }
    }

    // Skills parsing
    let skillsList: string[] = [];
    if (candidateData?.skills) {
      if (typeof candidateData.skills === 'string') {
        skillsList = candidateData.skills.split(/[,;|]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      } else if (Array.isArray(candidateData.skills)) {
        skillsList = candidateData.skills;
      }
    }

    // Return the consolidated profile
    return {
      candidateId: candidateData?.candidate_id || cId,
      name: candidateData?.name || candidateData?.candidate_name || 'Candidate ' + cId,
      email: candidateData?.email || '',
      phone: candidateData?.phone || '',
      skills: skillsList,
      experience: candidateData?.experience || '0',
      education: candidateData?.education || candidateData?.qualification || '',
      linkedinUrl: candidateData?.linkedin_url || candidateData?.linkedin || '',
      resumePath: candidateData?.resume_path || candidateData?.resumepath || candidateData?.resume || '',
      source: candidateData?.source || (referral ? 'Employee Referral' : 'Direct Application'),
      currentRole: candidateData?.current_role || candidateData?.designation || '',
      department: candidateData?.department || '',
      appliedDate: candidateData?.applied_date || (applications.length > 0 ? applications[0].appliedDate : ''),
      applications,
      interviewHistory,
      referral,
      offers
    };
  }

  /**
   * Opens or downloads the candidate resume.
   */
  async viewResume(fileName: string): Promise<void> {
    if (!fileName) {
      throw new Error('No resume file associated with this candidate.');
    }
    const cleanFileName = fileName.split(/[/\\]/).pop()?.trim() || fileName;
    try {
      const base64 = await this.heroService.downloadDocumentRMS(cleanFileName);
      if (base64) {
        this.heroService.openBase64Document(base64, cleanFileName);
      } else {
        throw new Error('Resume content empty.');
      }
    } catch (e) {
      console.warn('[CandidateDetailService] Direct download failed, using fallback:', e);
      const fallbackUrl = `http://192.168.1.196:8080/home/RMS/documents/${cleanFileName}`;
      window.open(fallbackUrl, '_blank');
    }
  }
}
