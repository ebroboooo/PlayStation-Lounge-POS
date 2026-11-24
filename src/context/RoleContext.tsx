import React, { createContext, useContext, useState } from 'react';
import { verifyLocalAdmin } from '../services/LocalAdminService';

export type EmployeeRole = 'admin' | 'cashier';

interface RoleContextType {
  role: EmployeeRole;
  setRole: (role: EmployeeRole) => void;
  unlockAdmin: (password: string) => Promise<boolean>;
  canChangePricing: boolean;
  canChangeSettings: boolean;
  canAccessAuditLogs: boolean;
  canDelete: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Reload always locks privileged operations.
  const [role, setRoleState] = useState<EmployeeRole>('cashier');

  const setRole = (newRole: EmployeeRole) => {
    if (newRole !== 'cashier') throw new Error('Use unlockAdmin to enter admin mode');
    setRoleState('cashier');
  };

  const unlockAdmin = async (password: string): Promise<boolean> => {
    if (!(await verifyLocalAdmin(password))) return false;
    setRoleState('admin');
    return true;
  };

  const isAdmin = role === 'admin';

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        unlockAdmin,
        canChangePricing: isAdmin,
        canChangeSettings: isAdmin,
        canAccessAuditLogs: isAdmin,
        canDelete: isAdmin
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
