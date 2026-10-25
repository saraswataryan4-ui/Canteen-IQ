import React, { createContext, useContext, useState } from 'react';
import {
  AuthAdapter,
  demoAuthAdapter,
  hasStaffPermission,
  Permission,
  StaffSession,
  StaffSignInResult,
  UserRole,
} from './authService';

interface AuthContextValue {
  staffSession: StaffSession | null;
  currentRole: UserRole;
  isStaffAuthenticated: boolean;
  loginStaff: (staffId: string, passcode: string) => Promise<StaffSignInResult>;
  logoutStaff: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  adapter?: AuthAdapter;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  adapter = demoAuthAdapter,
}) => {
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() =>
    adapter.getCurrentSession()
  );

  const loginStaff = async (
    staffId: string,
    passcode: string
  ): Promise<StaffSignInResult> => {
    const result = await adapter.signInStaff(staffId, passcode);
    if (result.ok && result.session) {
      setStaffSession(result.session);
    }
    return result;
  };

  const logoutStaff = async (): Promise<void> => {
    await adapter.signOutStaff();
    setStaffSession(null);
  };

  const can = (permission: Permission): boolean =>
    hasStaffPermission(staffSession, permission);

  const value: AuthContextValue = {
    staffSession,
    currentRole: staffSession ? UserRole.Staff : UserRole.Student,
    isStaffAuthenticated: Boolean(
      staffSession && staffSession.role === UserRole.Staff
    ),
    loginStaff,
    logoutStaff,
    can,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
