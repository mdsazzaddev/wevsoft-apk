import React from 'react';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { DepartmentList } from './DepartmentList';
import { ProjectTasksBoard } from './ProjectTasksBoard';

export const WorkspacePage: React.FC = () => {
  return (
    <div className="flex h-full bg-background overflow-hidden">
      <WorkspaceSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 space-y-12">
          
          <div className="mb-8 border-b border-border pb-6">
            <h1 className="text-3xl font-black text-foreground mb-2">Acme Corp Workspace</h1>
            <p className="text-muted-foreground">Manage your departments, teams, and projects.</p>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-6">Departments</h2>
            <DepartmentList />
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 mt-12">Engineering Project Board</h2>
            <div className="h-[600px]">
              <ProjectTasksBoard />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
