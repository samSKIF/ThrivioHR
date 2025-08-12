// Shared TypeScript types for ThrivioHR platform
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export type Status = 'active' | 'inactive' | 'terminated';