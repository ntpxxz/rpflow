export type UserRole = 'Admin' | 'User';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}
