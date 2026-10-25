/**
 * Role-Based Access Control (RBAC) & Authentication Service Boundary
 *
 * IMPORTANT PROTOTYPE SECURITY NOTE:
 * This hackathon demo runs entirely in the browser without a backend auth server.
 * Client-side checks below exist strictly to separate Student vs. Staff UI workflows
 * and prevent accidental student mutations during a demo. Real security requires
 * replacing `demoAuthAdapter` with `httpBackendAuthAdapter` backed by server-verified
 * sessions/JWTs and server-side authorization middleware on `/api/staff/*` routes.
 */

export enum UserRole {
  Student = 'student',
  Staff = 'staff',
}

export enum Permission {
  ViewStaffDashboard = 'staff:view_dashboard',
  UpdateOrderStatus = 'orders:update_status',
  ManageInventory = 'inventory:manage',
  ManageTables = 'tables:manage',
  ResetDemoData = 'system:reset_demo',
}

export interface StaffSession {
  userId: string;
  staffId: string;
  displayName: string;
  roleTitle: string;
  role: UserRole.Staff;
  permissions: Permission[];
  issuedAt: string;
  isDemoOnly: true;
}

export interface StaffSignInResult {
  ok: boolean;
  session?: StaffSession;
  error?: string;
}

/**
 * Pluggable adapter interface so a backend `/api/auth/*` service
 * can replace the local demo adapter without changing UI components.
 */
export interface AuthAdapter {
  getCurrentSession(): StaffSession | null;
  signInStaff(staffId: string, passcode: string): Promise<StaffSignInResult>;
  signOutStaff(): Promise<void>;
}

const DEMO_STAFF_SESSION_KEY = 'canteeniq_demo_staff_session_v1';

interface DemoStaffAccount {
  staffId: string;
  passcode: string;
  displayName: string;
  roleTitle: string;
  permissions: Permission[];
}

export const DEMO_STAFF_ACCOUNTS: DemoStaffAccount[] = [
  {
    staffId: 'STAFF-01',
    passcode: 'canteen2026',
    displayName: 'Rajesh Verma',
    roleTitle: 'Canteen Operations Supervisor',
    permissions: [
      Permission.ViewStaffDashboard,
      Permission.UpdateOrderStatus,
      Permission.ManageInventory,
      Permission.ManageTables,
      Permission.ResetDemoData,
    ],
  },
  {
    staffId: 'CHEF-02',
    passcode: 'kitchen2026',
    displayName: 'Meera Krishnan',
    roleTitle: 'Kitchen Counter Lead',
    permissions: [
      Permission.ViewStaffDashboard,
      Permission.UpdateOrderStatus,
      Permission.ManageInventory,
      Permission.ManageTables,
    ],
  },
];

export const demoAuthAdapter: AuthAdapter = {
  getCurrentSession(): StaffSession | null {
    try {
      const raw = sessionStorage.getItem(DEMO_STAFF_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StaffSession;
      if (parsed && parsed.role === UserRole.Staff && parsed.staffId) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  async signInStaff(
    staffId: string,
    passcode: string
  ): Promise<StaffSignInResult> {
    const normalizedId = staffId.trim().toUpperCase();
    const trimmedCode = passcode.trim();

    if (!normalizedId || !trimmedCode) {
      return {
        ok: false,
        error: 'Please enter both a Demo Staff ID and Demo Passcode.',
      };
    }

    const matched = DEMO_STAFF_ACCOUNTS.find(
      (acct) =>
        acct.staffId.toUpperCase() === normalizedId &&
        acct.passcode === trimmedCode
    );

    if (!matched) {
      return {
        ok: false,
        error:
          'Invalid demo credentials. Use STAFF-01 with passcode canteen2026 for demo testing.',
      };
    }

    const session: StaffSession = {
      userId: `staff-${matched.staffId.toLowerCase()}`,
      staffId: matched.staffId,
      displayName: matched.displayName,
      roleTitle: matched.roleTitle,
      role: UserRole.Staff,
      permissions: matched.permissions,
      issuedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isDemoOnly: true,
    };

    try {
      sessionStorage.setItem(DEMO_STAFF_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore restricted storage environments
    }

    return { ok: true, session };
  },

  async signOutStaff(): Promise<void> {
    try {
      sessionStorage.removeItem(DEMO_STAFF_SESSION_KEY);
    } catch {
      // Ignore restricted storage environments
    }
  },
};

export function hasStaffPermission(
  session: StaffSession | null,
  permission: Permission
): boolean {
  if (!session || session.role !== UserRole.Staff) {
    return false;
  }
  return session.permissions.includes(permission);
}
