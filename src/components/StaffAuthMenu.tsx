import React, { useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { Lock, LogIn, LogOut, ShieldCheck, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StaffAuthMenu: React.FC = () => {
  const { isStaffMode, activeStaff, loginStaff, logoutStaff, setIsStaffPanelOpen } = useValueList();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = loginStaff(username, password);
    if (res.success) {
      setIsModalOpen(false);
      setUsername('');
      setPassword('');
    } else {
      setError(res.message);
    }
  };

  if (isStaffMode && activeStaff) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsStaffPanelOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-bold transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{activeStaff.displayName || activeStaff.username}</span>
          <span className="text-[10px] opacity-75 uppercase">({activeStaff.role})</span>
        </button>
        <button
          onClick={logoutStaff}
          title="Sign Out"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-[#21262d] transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#21262d] hover:bg-neutral-200 dark:hover:bg-[#30363d] text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer border border-neutral-200 dark:border-[#30363d]"
      >
        <Lock className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Staff Access</span>
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#30363d]">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-500" />
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Staff Portal Login</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogin} className="mt-4 space-y-3">
                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Authenticate</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
