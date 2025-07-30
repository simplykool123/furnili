// Project stage validation utilities for material requests

export const MATERIAL_REQUEST_ALLOWED_STAGES = [
  'client-approved',
  'production', 
  'installation',
  'handover'
];

export const PROJECT_STAGE_NAMES = {
  'prospect': 'Prospect',
  'recce-done': 'Recce Done',
  'design-in-progress': 'Design In Progress', 
  'design-approved': 'Design Approved',
  'estimate-given': 'Estimate Given',
  'client-approved': 'Client Approved',
  'production': 'Production',
  'installation': 'Installation',
  'handover': 'Handover',
  'completed': 'Completed',
  'on-hold': 'On Hold',
  'lost': 'Lost'
};

export function canOrderMaterials(projectStage: string): boolean {
  return MATERIAL_REQUEST_ALLOWED_STAGES.includes(projectStage);
}

export function getStageDisplayName(stage: string): string {
  return PROJECT_STAGE_NAMES[stage as keyof typeof PROJECT_STAGE_NAMES] || stage;
}

export function getMaterialRequestEligibleProjects(projects: any[]): any[] {
  return projects.filter(project => 
    canOrderMaterials(project.stage) && project.isActive
  );
}