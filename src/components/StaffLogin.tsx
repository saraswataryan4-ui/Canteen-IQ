import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { DEMO_STAFF_ACCOUNTS } from '../auth/authService';

interface StaffLoginProps {
  onLoginSuccess: () => void;
  onReturnToStudentSite: () => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  onLoginSuccess,
  onReturnToStudentSite,
}) => {
  const { loginStaff } = useAuth();
  const [staffId, setStaffId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    await new Promise((resolve) => window.setTimeout(resolve, 160));
    const result = await loginStaff(staffId, passcode);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(
        result.error || 'Unable to sign in with those demo credentials.'
      );
      return;
    }

    onLoginSuccess();
  };

  const fillDemoAccount = (id: string, code: string) => {
    setStaffId(id);
    setPasscode(code);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      {/* Clean 3-Zone Staff Login Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={onReturnToStudentSite}
            className="text-xl font-bold tracking-tight text-emerald-950 hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            CanteenIQ
          </button>

          <nav
            aria-label="Portal Switch"
            className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <span className="text-emerald-800 font-semibold whitespace-nowrap shrink-0">
              Staff Portal Login (Demo)
            </span>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onReturnToStudentSite}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Student Website</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Login Workspace */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-lg w-full space-y-6">
          {/* Login Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-emerald-700">
                Staff Panel Access · DEMO ONLY
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                Canteen Staff Sign In
              </h1>
              <p className="text-sm text-slate-600">
                Sign in with a demo staff account to view incoming orders, update
                order statuses, manage inventory, and control table availability.
              </p>
            </div>

            {/* Honest DEMO ONLY Prototype Disclosure */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                <span>DEMO ONLY — Not Real Security</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                This hackathon prototype does not use backend authentication.
                Frontend sign-in separates Student and Staff workflows for demo
                purposes only; production deployment requires server-verified
                sessions and server-side role authorization.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs font-medium text-red-800"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="staff-id-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Demo Staff ID
                </label>
                <input
                  id="staff-id-input"
                  type="text"
                  required
                  autoComplete="username"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="e.g., STAFF-01"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-passcode-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Demo Passcode
                </label>
                <input
                  id="staff-passcode-input"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter demo passcode"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening Demo Staff Dashboard...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In to Staff Dashboard (Demo)</span>
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials Helper for Hackathon Judges */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <p className="text-xs font-semibold text-slate-700">
                Available Hackathon Demo Staff Accounts (Click to Autofill)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_STAFF_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.staffId}
                    type="button"
                    onClick={() => fillDemoAccount(acct.staffId, acct.passcode)}
                    className="text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors cursor-pointer space-y-0.5"
                  >
                    <p className="text-xs font-bold font-mono text-emerald-900">
                      {acct.staffId} · {acct.passcode}
                    </p>
                    <p className="text-xs text-slate-600 truncate">
                      {acct.displayName} ({acct.roleTitle})
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
