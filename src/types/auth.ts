/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  hourlyWage: number;
  activeStatus: boolean;
  email?: string;
  pin?: string;
  contact?: string;
}
