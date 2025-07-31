interface ProjectManagementIconProps {
  className?: string;
}

export default function ProjectManagementIcon({ className = "h-4 w-4" }: ProjectManagementIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Clock/Timer */}
      <circle cx="6" cy="5" r="3" />
      <path d="M4.5 7.5L7.5 4.5" />
      
      {/* Person/User */}
      <circle cx="12" cy="12" r="3" />
      <path d="M8 18c0-2.5 1.79-4 4-4s4 1.5 4 4" />
      
      {/* Task List/Checklist */}
      <rect x="2" y="10" width="5" height="7" rx="1" />
      <path d="M3 12h3M3 14h2M3 16h3" />
      
      {/* Communication Bubbles */}
      <path d="M17 8c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2h-1l-2 2v-2h-1c-1.1 0-2-.9-2-2v-3c0-1.1.9-2 2-2h4z" />
      
      {/* Connecting Lines */}
      <path d="M9 5l3 3M15 8l-3 1" />
      <path d="M7 10l5 2M17 10l-5 2" />
    </svg>
  );
}