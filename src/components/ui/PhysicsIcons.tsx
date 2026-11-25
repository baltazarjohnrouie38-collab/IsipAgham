import React, { useId } from 'react';

export interface GraphicIconProps {
  className?: string;
}

/**
 * IsipAgham signature layered vector instrumentation icons.
 * Uses per-instance gradient IDs via useId() so desktop, mobile, and card duplicates never collide.
 */

export const HomeGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-6 w-6' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-roof`} x1="4" y1="4" x2="28" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id={`${uid}-wall`} x1="7" y1="13" x2="25" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFF6FF" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
        <linearGradient id={`${uid}-door`} x1="13" y1="17" x2="19" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Plinth shadow */}
      <rect x="6" y="25" width="20" height="3.5" rx="1.75" fill="#1E3A8A" fillOpacity="0.22" />
      {/* Pavilion body */}
      <path
        d="M7 14.5L16 8L25 14.5V25C25 26.1046 24.1046 27 23 27H9C7.89543 27 7 26.1046 7 25V14.5Z"
        fill={`url(#${uid}-wall)`}
        stroke="#1E3A8A"
        strokeOpacity="0.24"
        strokeWidth="1"
      />
      {/* Observatory canopy roof */}
      <path
        d="M3.5 14.2C2.9 14.7 3.25 15.65 4.02 15.65H27.98C28.75 15.65 29.1 14.7 28.5 14.2L17.1 4.7C16.46 4.17 15.54 4.17 14.9 4.7L3.5 14.2Z"
        fill={`url(#${uid}-roof)`}
      />
      {/* Glass dome arch / door */}
      <path
        d="M12.5 21.2C12.5 19.1565 14.067 17.5 16 17.5C17.933 17.5 19.5 19.1565 19.5 21.2V27H12.5V21.2Z"
        fill={`url(#${uid}-door)`}
      />
      {/* Precision roof highlight */}
      <path
        d="M16 5.9L25.6 13.8H6.4L16 5.9Z"
        stroke="#BAE6FD"
        strokeOpacity="0.5"
        strokeWidth="0.8"
      />
      {/* Observatory skylight */}
      <circle cx="16" cy="12" r="1.7" fill="#FEF3C7" />
    </svg>
  );
};

export const LessonsGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-6 w-6' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-cover`} x1="5" y1="4" x2="26" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id={`${uid}-pages`} x1="8" y1="21" x2="26" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id={`${uid}-brass`} x1="19" y1="5" x2="23" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Back cover thickness */}
      <rect x="6" y="4.5" width="20" height="23.5" rx="3.5" fill="#172554" />
      {/* Page block bottom */}
      <rect x="8.5" y="21.5" width="16.5" height="5.5" rx="2" fill={`url(#${uid}-pages)`} />
      {/* Main front cover */}
      <rect x="6" y="3.8" width="19" height="19.5" rx="3.2" fill={`url(#${uid}-cover)`} />
      {/* Spine groove */}
      <path d="M9.6 4.2V22.8" stroke="#93C5FD" strokeOpacity="0.45" strokeWidth="1.1" />
      {/* Pendulum / vector arc engraved on cover */}
      <path
        d="M12.5 16.8C13.8 13.8 17.5 12.2 21 13.3"
        stroke="#BAE6FD"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="15.2" cy="10.2" r="1.4" fill="#38BDF8" />
      {/* Brass ribbon bookmark */}
      <path d="M19.2 3.8H22.8V13.8L21 12.1L19.2 13.8V3.8Z" fill={`url(#${uid}-brass)`} />
      {/* Page edge rule */}
      <path d="M10.5 24.4H23" stroke="#64748B" strokeOpacity="0.45" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
};

export const StudyGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-6 w-6' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-back`} x1="7" y1="4" x2="26" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={`${uid}-mid`} x1="5" y1="8" x2="25" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id={`${uid}-front`} x1="4" y1="11" x2="27" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      {/* Back amber flashcard */}
      <rect x="8" y="4.5" width="19" height="14" rx="3" transform="rotate(6 8 4.5)" fill={`url(#${uid}-back)`} />
      {/* Middle sky card */}
      <rect x="5" y="7.8" width="20.5" height="14.8" rx="3" fill={`url(#${uid}-mid)`} />
      {/* Front deep-cobalt active card */}
      <rect
        x="4"
        y="11"
        width="22.5"
        height="16.5"
        rx="3.4"
        fill={`url(#${uid}-front)`}
        stroke="#93C5FD"
        strokeOpacity="0.45"
        strokeWidth="0.9"
      />
      {/* Formula bars & recall dot */}
      <rect x="8" y="15.4" width="10.5" height="2.1" rx="1.05" fill="#EFF6FF" />
      <rect x="8" y="19.5" width="7.2" height="1.9" rx="0.95" fill="#93C5FD" />
      <circle cx="22.2" cy="21.8" r="2.2" fill="#FBBF24" />
    </svg>
  );
};

export const VisualizerGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-6 w-6' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-core`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#172554" />
        </radialGradient>
        <linearGradient id={`${uid}-ringA`} x1="4" y1="10" x2="28" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={`${uid}-ringB`} x1="8" y1="5" x2="24" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* Back orbital ellipse */}
      <ellipse
        cx="16"
        cy="16"
        rx="12.2"
        ry="5.1"
        transform="rotate(-34 16 16)"
        stroke={`url(#${uid}-ringB)`}
        strokeWidth="1.9"
        strokeOpacity="0.88"
      />
      {/* Dimensional 3D physics sphere */}
      <circle cx="16" cy="16" r="7.4" fill={`url(#${uid}-core)`} />
      {/* Specular rim reflection */}
      <path
        d="M12.2 11.4C13.6 10.2 15.6 9.8 17.4 10.2"
        stroke="#E0F2FE"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      {/* Front tilted brass gyroscope ring */}
      <ellipse
        cx="16"
        cy="16"
        rx="12.6"
        ry="4.9"
        transform="rotate(26 16 16)"
        stroke={`url(#${uid}-ringA)`}
        strokeWidth="2.1"
      />
      {/* Orbiting quantum particle */}
      <circle cx="25.6" cy="11.4" r="2.2" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="0.9" />
    </svg>
  );
};

export const TutorGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-6 w-6' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-bubble`} x1="4" y1="5" x2="27" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="52%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id={`${uid}-wave`} x1="9" y1="14" x2="23" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Subtle acoustic depth shadow */}
      <path
        d="M6.5 7.5H25.5C27.1569 7.5 28.5 8.84315 28.5 10.5V20.5C28.5 22.1569 27.1569 23.5 25.5 23.5H13.6L8.2 27.6C7.55 28.09 6.6 27.63 6.6 26.8V23.4C4.98 23.16 3.7 21.8 3.7 20.1V10.5C3.7 8.84315 4.84315 7.5 6.5 7.5Z"
        fill="#1E3A8A"
        fillOpacity="0.22"
        transform="translate(0 1.2)"
      />
      {/* Main speech capsule */}
      <path
        d="M6.5 5.5H25.5C27.1569 5.5 28.5 6.84315 28.5 8.5V19C28.5 20.6569 27.1569 22 25.5 22H13.5L8.1 26.2C7.45 26.7 6.5 26.24 6.5 25.4V22C4.84315 22 3.5 20.6569 3.5 19V8.5C3.5 6.84315 4.84315 5.5 6.5 5.5Z"
        fill={`url(#${uid}-bubble)`}
      />
      {/* Top glass bevel */}
      <path d="M7.5 7.2H24.5" stroke="#BAE6FD" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
      {/* Physics resonance waveform */}
      <path
        d="M8.5 13.8H11.2L13 10.1L15.6 17.5L18.1 11.4L19.9 13.8H23.5"
        stroke={`url(#${uid}-wave)`}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const ProfileGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-6 w-6' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-disc`} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id={`${uid}-badge`} x1="10" y1="8" x2="22" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12.5" fill={`url(#${uid}-disc)`} />
      <circle cx="16" cy="16" r="10.8" stroke="#BAE6FD" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="16" cy="12.2" r="3.8" fill={`url(#${uid}-badge)`} />
      <path
        d="M9.8 23.8C10.9 20.5 13.2 19 16 19C18.8 19 21.1 20.5 22.2 23.8"
        fill={`url(#${uid}-badge)`}
      />
      {/* Brass star pin */}
      <circle cx="24.5" cy="8.5" r="2.6" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
};

export const ChecklistGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-6 w-6' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-board`} x1="6" y1="5" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id={`${uid}-paper`} x1="9" y1="9" x2="23" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
      </defs>
      <rect x="6" y="5.5" width="20" height="23" rx="3.4" fill={`url(#${uid}-board)`} />
      <rect x="8.5" y="9" width="15" height="17" rx="2" fill={`url(#${uid}-paper)`} />
      {/* Brass clipboard clasp */}
      <rect x="11.5" y="3.5" width="9" height="4.2" rx="1.8" fill="#FBBF24" stroke="#FEF3C7" strokeWidth="0.7" />
      {/* Checkmark + task lines */}
      <path
        d="M11.2 14.8L13 16.6L16.2 13.2"
        stroke="#0284C7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="17.8" y="14.2" width="3.8" height="1.8" rx="0.9" fill="#64748B" />
      <path
        d="M11.2 20.6L13 22.4L16.2 19"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="17.8" y="20" width="3.8" height="1.8" rx="0.9" fill="#64748B" />
    </svg>
  );
};

export const UploadGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-5 w-5' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-doc`} x1="6" y1="4" x2="25" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <path
        d="M7 6.5C7 4.84315 8.34315 3.5 10 3.5H19.2L25 9.3V25.5C25 27.1569 23.6569 28.5 22 28.5H10C8.34315 28.5 7 27.1569 7 25.5V6.5Z"
        fill={`url(#${uid}-doc)`}
      />
      <path d="M19 3.5V8.5C19 9.05228 19.4477 9.5 20 9.5H25L19 3.5Z" fill="#BAE6FD" />
      {/* Upward vector arrow */}
      <path
        d="M16 22.5V13.8M16 13.8L12.3 17.4M16 13.8L19.7 17.4"
        stroke="#FEF08A"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const NotesGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-5 w-5' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-sheet`} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      <rect x="6" y="4" width="20" height="24" rx="3.4" fill={`url(#${uid}-sheet)`} />
      <rect x="9.5" y="9.5" width="13" height="2.2" rx="1.1" fill="#FDE68A" />
      <rect x="9.5" y="14.5" width="11" height="2" rx="1" fill="#E0E7FF" />
      <rect x="9.5" y="19.3" width="8.5" height="2" rx="1" fill="#A5B4FC" />
      <circle cx="22.5" cy="23.5" r="3" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.1" />
    </svg>
  );
};

export const StreakGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-5 w-5' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-flame`} x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <path
        d="M17.2 3.5C17.2 3.5 23.6 9.3 23.6 16.5C23.6 22.4 20.1 27.5 15.6 27.5C10.9 27.5 7.8 23.4 7.8 18.2C7.8 14.5 9.8 11.4 11.4 9.7C11.4 12.1 12.7 13.7 14 14.3C13.6 10.3 15.3 6.2 17.2 3.5Z"
        fill={`url(#${uid}-flame)`}
      />
      <path
        d="M15.8 16.4C17.9 18.4 18.6 20.8 18.1 22.8C17.6 24.4 16.3 25.4 14.9 25.4C13.2 25.4 12.1 23.9 12.1 21.8C12.1 19.8 13.7 17.9 15.8 16.4Z"
        fill="#FEF9C3"
      />
    </svg>
  );
};

export const TrophyGraphicIcon: React.FC<GraphicIconProps> = ({ className = 'h-5 w-5' }) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-cup`} x1="8" y1="5" x2="24" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Side handles */}
      <path d="M9.5 7.5H6C5.2 7.5 4.8 8.3 5 9.2C5.6 12.2 7.3 14.1 10 14.6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M22.5 7.5H26C26.8 7.5 27.2 8.3 27 9.2C26.4 12.2 24.7 14.1 22 14.6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      {/* Cup */}
      <path
        d="M9.5 5.5H22.5V12.5C22.5 16.09 19.59 19 16 19C12.41 19 9.5 16.09 9.5 12.5V5.5Z"
        fill={`url(#${uid}-cup)`}
      />
      {/* Stem & base */}
      <rect x="14.3" y="18.6" width="3.4" height="5.2" fill="#D97706" />
      <rect x="10.2" y="23.5" width="11.6" height="3.5" rx="1.6" fill="#1E3A8A" />
      <path d="M12.5 8.2H19.5" stroke="#FEF3C7" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};
