import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { JobExplorerView } from '../components/jobs/JobExplorerView';
import { AICareerAssistantModal } from '../components/jobs/AICareerAssistantModal';
import { CompanyPortfolioView } from '../components/employer/CompanyPortfolioView';
import { EmployerDashboardView } from '../components/employer/EmployerDashboardView';
import { Briefcase, Building, Plus, FileText, UserSearch, ClipboardList } from 'lucide-react';

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'company' | 'employer_dashboard'>('jobs');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedCompanySlug, setSelectedCompanySlug] = useState('sora-ai-labs');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Navigation Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 backdrop-blur-xl border border-border p-3 rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'jobs' ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <Briefcase size={15} /> Career Job Board
          </button>

          <button
            onClick={() => {
              setSelectedCompanySlug('sora-ai-labs');
              setActiveTab('company');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'company' ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <Building size={15} /> View Company Portfolio
          </button>

          <Link
            to="/jobs/create"
            className="px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/10"
          >
            <FileText size={15} /> Post a Job
          </Link>
          <Link
            to="/jobs/applications"
            className="px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/10"
          >
            <ClipboardList size={15} /> My Applications
          </Link>
          <Link
            to="/jobs/talent"
            className="px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/10"
          >
            <UserSearch size={15} /> Talent Search
          </Link>
        </div>

        <button
          onClick={() => setActiveTab('employer_dashboard')}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={15} /> Employer Studio
        </button>
      </div>

      {activeTab === 'jobs' && (
        <JobExplorerView onOpenAiCareerModal={() => setIsAiModalOpen(true)} />
      )}

      {activeTab === 'company' && (
        <CompanyPortfolioView companySlug={selectedCompanySlug} onBackToJobs={() => setActiveTab('jobs')} />
      )}

      {activeTab === 'employer_dashboard' && (
        <EmployerDashboardView onBackToJobs={() => setActiveTab('jobs')} />
      )}

      {/* AI Career Assistant Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <AICareerAssistantModal onClose={() => setIsAiModalOpen(false)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
