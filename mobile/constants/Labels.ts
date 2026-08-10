export const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  PRODUCER: 'Producer',
  DIRECTOR_OF_PHOTOGRAPHY: 'DP',
  GAFFER: 'Gaffer',
  KEY_GRIP: 'Key Grip',
  SOUND_ENGINEER: 'Sound Engineer',
  EDITOR: 'Editor',
  FIRST_AC: '1st AC',
  SECOND_AC: '2nd AC',
  COLORIST: 'Colorist',
  PRODUCTION_DESIGNER: 'Production Designer',
  COSTUME_DESIGNER: 'Costume Designer',
  SCREENWRITER: 'Screenwriter',
  ACTOR: 'Actor',
  PRODUCTION_ASSISTANT: 'PA',
  COMPOSER: 'Composer',
  VFX_ARTIST: 'VFX Artist',
  LINE_PRODUCER: 'Line Producer',
  CASTING_DIRECTOR: 'Casting Director',
  OTHER: 'Other',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PRE_PRODUCTION: 'Pre-Production',
  FILMING: 'Filming',
  POST_PRODUCTION: 'Post-Production',
  COMPLETED: 'Completed',
};

export const COMPENSATION_LABELS: Record<string, string> = {
  PAID: 'Paid',
  DEFERRED: 'Deferred',
  CREDIT_COPY: 'Credit / Copy',
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  INDIE: 'Indie',
  PROFESSIONAL: 'Professional',
  VETERAN: 'Veteran',
};

// Buckets a person's primary roles into the four network-connection categories
// from the product spec. A role that doesn't map anywhere falls into Crew.
export function categorizeRoles(roles: string[]): 'Directors' | 'Cinematographers / DPs' | 'Editors / Post-Production' | 'Crew & Support' {
  if (roles.includes('DIRECTOR')) return 'Directors';
  if (roles.includes('DIRECTOR_OF_PHOTOGRAPHY') || roles.includes('COLORIST')) {
    return 'Cinematographers / DPs';
  }
  if (roles.includes('EDITOR') || roles.includes('VFX_ARTIST')) {
    return 'Editors / Post-Production';
  }
  return 'Crew & Support';
}
