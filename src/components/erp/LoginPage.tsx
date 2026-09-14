'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Chrome,
  UserPlus, LogIn, CloudOff, Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ADMIN_CREDENTIALS, DEFAULT_COMPANY_PROFILE } from '@/lib/erp/constants';
import type { Role } from '@/lib/erp/types';
import { useERP, setCurrentUserUid, startRealtimeSync, stopRealtimeSync } from '@/lib/erp/store';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';

/** Render a company name with the accent word highlighted */
function renderName(name: string, accent: string, accentClass = 'text-emerald-500') {
  if (!accent) return name;
  const parts = name.split(new RegExp(`(${accent})`, 'i'));
  return parts.map((p, i) =>
    p.toLowerCase() === accent.toLowerCase()
      ? <span key={i} className={accentClass}>{p}</span>
      : p
  );
}

export function LoginPage() {
  const loginWithEmail = useERP((s) => s.loginWithEmail);
  const loginWithCredentials = useERP((s) => s.loginWithCredentials);
  const login = useERP((s) => s.login);
  const companyProfile = useERP((s) => s.companyProfile) || DEFAULT_COMPANY_PROFILE;

  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mode, setMode] = React.useState<'login' | 'signup'>('login');
  const [loading, setLoading] = React.useState(false);
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);

  const firebaseOn = isFirebaseConfigured();

  React.useEffect(() => {
    if (!auth || !firebaseOn) return;
    getRedirectResult(auth).catch((err: any) => {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setError(`Google login ke liye Firebase Authorized domains me ${window.location.hostname} add karna hoga.`);
      } else if (code && code !== 'auth/no-auth-event') {
        setError(err?.message || 'Google sign-in failed');
      }
    });
  }, [firebaseOn]);

  // Listen for Firebase Auth state changes
  React.useEffect(() => {
    if (!auth || !firebaseOn) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setCurrentUserUid(user.uid);
        await useERP.persist.rehydrate();
        startRealtimeSync();

        if (user.isAnonymous && useERP.getState().currentUser) {
          return;
        }

        let role: Role = 'management';
        if (user.email === ADMIN_CREDENTIALS.email) role = 'owner';
        const member = useERP.getState().team.find((m) => m.email === user.email);
        if (member) role = (member.loginRole || member.dept) as Role;

        login({
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role,
        });
        toast.success(`Welcome, ${user.displayName || user.email}!`);
      } else {
        setFirebaseUser(null);
        setCurrentUserUid(null);
        stopRealtimeSync();
      }
    });
    return () => unsub();
  }, [firebaseOn, login]);

  // ===== Firebase Auth: Email/Password =====
  const firebaseEmailLogin = async () => {
    const id = identifier.trim();
    if (!auth || !id || !password.trim()) {
      setError('Email/User ID aur Password zaroori hai');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const isEmail = id.includes('@');
      if (mode === 'signup') {
        if (!isEmail) {
          setError('Signup ke liye email address use karo. User ID Team section me add hota hai.');
          return;
        }
        await createUserWithEmailAndPassword(auth, id, password);
        toast.success('Account created! Welcome to Karyam Dessin ERP.');
      } else if (isEmail) {
        await signInWithEmailAndPassword(auth, id, password);
        toast.success('Login successful!');
      } else {
        await localCredentialLogin(true);
        toast.success('Login successful!');
      }
    } catch (err: any) {
      const localOk = mode === 'login' ? await localCredentialLogin(true) : false;
      if (localOk) {
        toast.success('Login successful!');
        setLoading(false);
        return;
      }

      const code = err?.code || '';
      let msg = err?.message || 'Login failed';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') msg = 'Invalid email/user ID or password';
      else if (code === 'auth/user-not-found') msg = 'No account found with this email. Try Sign Up.';
      else if (code === 'auth/email-already-in-use') msg = 'This email is already registered. Try Login.';
      else if (code === 'auth/weak-password') msg = 'Password should be at least 6 characters';
      else if (code === 'auth/popup-closed-by-user') msg = 'Google sign-in was cancelled';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const localCredentialLogin = async (withCloudSession = false) => {
    const id = identifier.trim();
    if (!id || !password.trim()) {
      setError('Email/User ID aur Password zaroori hai');
      return false;
    }

    const ok = id.includes('@')
      ? loginWithEmail(id, password)
      : loginWithCredentials(id, password);

    if (!ok) return false;

    if (withCloudSession && auth && !auth.currentUser) {
      try {
        const cred = await signInAnonymously(auth);
        setFirebaseUser(cred.user);
        setCurrentUserUid(cred.user.uid);
        await useERP.persist.rehydrate();
        startRealtimeSync();
      } catch (err: any) {
        console.error('[Firebase] Anonymous session failed:', err);
        toast.warning('Login ho gaya, lekin cloud sync ke liye Firebase Anonymous provider enable karna hoga.');
      }
    }

    setError('');
    return true;
  };

  // ===== Firebase Auth: Google Popup =====
  const firebaseGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        login_hint: ADMIN_CREDENTIALS.email,
      });
      await signInWithPopup(auth, provider);
      toast.success('Signed in with Google!');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled');
      } else if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account',
          login_hint: ADMIN_CREDENTIALS.email,
        });
        await signInWithRedirect(auth, provider);
      } else if (code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled in Firebase Console.');
      } else if (code === 'auth/unauthorized-domain') {
        setError(`Google login ke liye Firebase Authorized domains me ${window.location.hostname} add karna hoga.`);
      } else {
        setError(err?.message || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== Local mode: Email + Password login (when Firebase not configured) =====
  const localEmailLogin = () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Email/User ID aur Password zaroori hai');
      return;
    }
    const id = identifier.trim();
    const ok = id.includes('@')
      ? loginWithEmail(id, password)
      : loginWithCredentials(id, password);
    if (!ok) {
      setError('Invalid email/user ID or password. Ask Admin to add your account in Team section.');
      return;
    }
    setError('');
    toast.success('Login successful!');
  };

  // ===== Local mode: Google unavailable until Firebase is configured =====
  const localGoogleLogin = () => {
    setError('Real Google login ke liye Firebase config, Google provider aur authorized domain set karna hoga.');
  };

  const handleSubmit = () => {
    if (firebaseOn) {
      firebaseEmailLogin();
    } else {
      localEmailLogin();
    }
  };

  const handleGoogle = () => {
    if (firebaseOn) {
      firebaseGoogleLogin();
    } else {
      localGoogleLogin();
    }
  };

  // If already logged in via Firebase, don't show login form
  if (firebaseUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,.12), transparent 70%)' }}
        animate={{ x: [0, 25, 0], y: [0, -25, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-16 -left-16 w-[350px] h-[350px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,.1), transparent 70%)' }}
        animate={{ x: [0, -25, 0], y: [0, 25, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-900 rounded-2xl p-8 w-[460px] max-w-full shadow-2xl relative z-10"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            {companyProfile.logoImage ? (
              <img src={companyProfile.logoImage} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
            ) : null}
            <div className="text-2xl font-black tracking-tight">
              {renderName(companyProfile.name || 'Karyam Dessin', companyProfile.accentWord || 'Dessin')}
            </div>
          </div>
          <p className="text-muted-foreground text-[13px] mt-1 mb-3">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
          {/* Mode badge: Cloud vs Local */}
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-4',
            firebaseOn
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
          )}>
            {firebaseOn ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
            {firebaseOn ? 'Cloud Sync Enabled' : 'Local Mode'}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email / User ID</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                placeholder="email@example.com or user ID"
                className="pl-9"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Your password"
                className="pl-9 pr-9"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-xs font-semibold mt-2.5"
          >
            {error}
          </motion.div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || !identifier.trim() || !password.trim()}
          className="w-full mt-5 h-11 text-[15px] font-bold"
        >
          {loading ? 'Please wait...' : (
            <>
              {mode === 'login'
                ? <><LogIn className="h-4 w-4 mr-1" /> Sign In</>
                : <><UserPlus className="h-4 w-4 mr-1" /> Create Account</>
              }
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          or
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google Sign-In */}
        <Button
          onClick={handleGoogle}
          disabled={loading}
          variant="outline"
          className="w-full h-11 text-sm font-bold"
        >
          <Chrome className="h-4 w-4 mr-2 text-blue-500" /> Continue with Google
        </Button>

        {/* Toggle login/signup */}
        <div className="text-center mt-4 text-xs text-muted-foreground">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }} className="text-emerald-600 font-bold hover:underline">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); }} className="text-emerald-600 font-bold hover:underline">Sign in</button></>
          )}
        </div>

        {/* Firebase setup notice (only in local mode) */}
        {!firebaseOn && (
          <div className="mt-4 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-700 dark:text-amber-300">
            <CloudOff className="inline h-3 w-3 mr-1" />
            Firebase not configured. Real Google login and cloud sync need Firebase setup.
          </div>
        )}
      </motion.div>
    </div>
  );
}
