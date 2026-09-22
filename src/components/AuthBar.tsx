import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { subscribeAuth, loginWithGoogle, logoutUser } from '../lib/firebase';
import { LogIn, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

interface AuthBarProps {
  onUserChanged?: (userId: string, user: User | null) => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({ onUserChanged }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      const activeUid = user ? user.uid : 'user_pro_01';
      if (onUserChanged) {
        onUserChanged(activeUid, user);
      }
    });

    return () => unsubscribe();
  }, [onUserChanged]);

  const handleSignIn = async () => {
    setAuthError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in popup cancelled or failed.');
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (err: any) {
      console.warn('Logout error:', err);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
        <span>Authenticating...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {currentUser ? (
        <div className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-md">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'User'}
              className="w-7 h-7 rounded-full border border-indigo-500/50 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              <UserIcon className="w-4 h-4" />
            </div>
          )}

          <div className="flex flex-col text-left">
            <span className="font-bold text-white leading-tight flex items-center gap-1">
              {currentUser.displayName || 'Authenticated User'}
              <ShieldCheck className="w-3 h-3 text-emerald-400 inline shrink-0" />
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {currentUser.email}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="ml-1 p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 transition-all cursor-pointer"
            title="Sign Out of Firebase Account"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-end">
          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer border border-indigo-400/30"
            title="Sign in with Google via Firebase Auth"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Google Sign-In</span>
          </button>
          {authError && (
            <span className="text-[9px] text-amber-400 mt-1 max-w-[150px] truncate">
              {authError}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
