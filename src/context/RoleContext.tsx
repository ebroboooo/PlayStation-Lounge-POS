import React, { createContext, useContext, useState, useEffect } from 'react';

export type EmployeeRole = 'admin' | 'cashier';

interface RoleContextType {
  role: EmployeeRole;
  setRole: (role: EmployeeRole) => void;
  canChangePricing: boolean;
  canChangeSettings: boolean;
  canAccessAuditLogs: boolean;
  canDelete: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<EmployeeRole>(() => {
    const saved = localStorage.getItem('v30_pos_role');
    return (saved as EmployeeRole) || 'cashier';
  });

  const setRole = (newRole: EmployeeRole) => {
    setRoleState(newRole);
    localStorage.setItem('v30_pos_role', newRole);
  };

  const isAdmin = role === 'admin';

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
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
