import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-career',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './career.component.html',
  styleUrls: ['./career.component.css']
})
export class CareerComponent {
  jobs = [
    { id: 1, title: 'Frontend Developer', company: 'TechNova', location: 'Remote', type: 'Full-time' },
    { id: 2, title: 'Backend Engineer', company: 'AlphaTech', location: 'New York, NY', type: 'Full-time' },
    { id: 3, title: 'Product Manager', company: 'TechNova', location: 'Remote', type: 'Full-time' },
    { id: 4, title: 'Data Scientist', company: 'DataCorp', location: 'San Francisco, CA', type: 'Contract' },
    { id: 5, title: 'DevOps Engineer', company: 'CloudSys', location: 'Seattle, WA', type: 'Full-time' },
    { id: 6, title: 'UI/UX Designer', company: 'AlphaTech', location: 'Remote', type: 'Part-time' },
    { id: 7, title: 'Full Stack Developer', company: 'WebSolutions', location: 'Austin, TX', type: 'Full-time' },
    { id: 8, title: 'Machine Learning Engineer', company: 'DataCorp', location: 'San Francisco, CA', type: 'Full-time' },
  ];

  filteredJobs = [...this.jobs];
  searchQuery = '';

  filterJobs() {
    const query = this.searchQuery.toLowerCase();
    this.filteredJobs = this.jobs.filter(job => 
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query)
    );
  }

  sortByCompany() {
    this.filteredJobs.sort((a, b) => a.company.localeCompare(b.company));
  }
}

