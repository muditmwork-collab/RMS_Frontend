import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroService } from '../../../hero.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-resume-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent {
  isParsing = false;
  isSaving = false;
  parsedData: any = null;
  files: { name: string; size: string; date: string; type: string, fileObj?: File }[] = [];
  isDragging = false;

  constructor(private heroService: HeroService, private router: Router) {}

  ngOnInit(): void {
    const candidateId = sessionStorage.getItem('candidate_id');
    console.log('Current Session Candidate ID:', candidateId);
    if (!candidateId) {
       console.warn('No candidate_id found in session. Saving will be disabled.');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      this.handleFile(droppedFiles[0]);
    }
  }

  onFileSelect(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.handleFile(inputElement.files[0]);
    }
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
  }

  private handleFile(file: File) {
    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
    let fileType = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    if (file.type === 'application/pdf') {
      fileType = 'PDF';
    } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      fileType = 'DOCX';
    }

    this.files.unshift({
      name: file.name,
      size: fileSize,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      type: fileType,
      fileObj: file
    });

    if (fileType === 'PDF') {
      this.parseResumeWithPDFPackage(file);
    }
  }

  async parseResumeWithPDFPackage(file: File) {
    this.isParsing = true;
    this.parsedData = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Use dynamic import for pdfjs-dist because it might not be fully ES-compatible depending on env
      const pdfjsLib = await (import('pdfjs-dist') as any);
      // Set worker to CDN for version 3.11.174 (compatible with ES2022 and below)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }

      console.log('Resulting text from PDF:', fullText);
      this.extractFieldsFromText(fullText);
    } catch (error: any) {
      console.error('Error parsing PDF:', error);
      alert('Failed to parse the PDF. ' + (error.message || error));
    } finally {
      this.isParsing = false;
    }
  }

  private extractFieldsFromText(text: string) {
    // Basic Regex Extractor
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/[\d]{3}[- .]?[\d]{3}[- .]?[\d]{4}/) || text.match(/\+?\d[\d\s\-\(\)]{8,}/);
    
    // Improved Name Extraction: Take the first substantial line (ignoring typical headers)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    let name = 'N/A';
    for (const line of lines.slice(0, 5)) {
       // Ignore common non-name headers
       if (!/resume|curriculum|vitae|profile|about|candidate|summary/i.test(line)) {
          name = line;
          break;
       }
    }

    // Simple keyword extraction for other fields
    let skills = 'N/A';
    let education = 'N/A';
    let experienceNum = 0;

    const lowerText = text.toLowerCase();
    
    // Skills heuristic: Look for Skill sections
    const skillKeywordIdx = lowerText.indexOf('skills');
    if (skillKeywordIdx !== -1) {
       skills = text.substring(skillKeywordIdx + 6, skillKeywordIdx + 500).split('\n')[0].substring(0, 499);
       // Remove leading colons or bullets
       skills = skills.replace(/^[:\-·\s]+/, '').trim();
    }

    // Experience: Support decimals with comma (e.g. 5,5 years) or dots
    const expKeywordIdx = lowerText.indexOf('experience');
    if (expKeywordIdx !== -1) {
       const nearExp = text.substring(expKeywordIdx - 50, expKeywordIdx + 150);
       // Matches digits followed by optional comma/dot and more digits (e.g., 5.5, 5,5)
       const yearMatch = nearExp.match(/(\d+[\.,]?\d*)\s*(year|yr|exp)/i);
       if (yearMatch) {
          const val = yearMatch[1].replace(',', '.');
          experienceNum = Math.round(parseFloat(val));
       }
    }

    const eduKeywordIdx = lowerText.indexOf('education');
    if (eduKeywordIdx !== -1) {
       education = text.substring(eduKeywordIdx + 9, eduKeywordIdx + 250).split('\n')[0].substring(0, 254);
       education = education.replace(/^[:\-·\s]+/, '').trim();
    }

    this.parsedData = {
      name: name.substring(0, 254),
      email: emailMatch ? emailMatch[0].substring(0, 254) : 'N/A',
      phone: phoneMatch ? phoneMatch[0].substring(0, 19) : 'N/A',
      skills: skills,
      experience: experienceNum,
      education: education
    };
    
    console.log('Locally extracted data (Refined):', this.parsedData);
  }

  saveToProfile() {
    if (!this.parsedData || this.files.length === 0) return;
    
    const candidateId = sessionStorage.getItem('candidate_id');
    if (!candidateId) {
      alert('You must be logged in to save to your profile. Please login and try again.');
      return;
    }

    this.isSaving = true;
    
    // Construct resume_path: UploadDocuments + FileName
    const fileName = this.files[0]?.name || 'resume.pdf';
    const resumePath = 'UploadDocuments' + fileName;

    const fieldsToUpdate: any = {
      name: this.parsedData.name !== 'N/A' ? this.parsedData.name : '',
      phone: this.parsedData.phone !== 'N/A' ? this.parsedData.phone : '',
      skills: this.parsedData.skills !== 'N/A' ? this.parsedData.skills : '',
      experience: this.parsedData.experience, // Matches INT column
      education: this.parsedData.education !== 'N/A' ? this.parsedData.education : '',
      resume_path: resumePath
    };

    this.heroService.updateCandidate(candidateId, fieldsToUpdate)
      .then(() => {
        alert('Resume information saved to your profile successfully!');
        this.router.navigate(['/candidate/candidate-data']);
      })
      .catch((err) => {
        console.error('Error saving to profile:', err);
        alert('Failed to save information to profile. Please try again.');
      })
      .finally(() => {
        this.isSaving = false;
      });
  }
}
