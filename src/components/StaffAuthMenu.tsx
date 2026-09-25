import React, { useState, useRef, useEffect } from 'react';
import { useValueList } from '../context/ValueListContext';
import { LogOut, ShieldCheck, Crown, ChevronDown, Lock, Users, BarChart3, Download, FileEdit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StaffAuthMenu: React.FC = () => {
  const {
    isStaffMode,
    isAdmin,
    isAnalyst,
    isConsultant,
    canExport,
    activeStaff,
    logoutStaff,
    setIsStaffPanelOpen,
    reports
  } = useValueList();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenStaffPortal = () => {
    setIsStaffPanelOpen(true);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logoutStaff();
    setIsOpen(false);
  };

  if (!isStaffMode || !activeStaff) {
    return null;
  }

  const roleText = activeStaff.role === 'Admin' 
    ? 'ADMIN' 
    : activeStaff.role === 'Analyst' 
    ? 'ANALYST' 
    : activeStaff.role === 'Consultant'
    ? 'CONSULTANT'
    : 'STAFF';

  return (
    <div className="relative" ref={menuRef}>
      {/* Logged In Staff Badge */}
      <motion.button
        id="staff-user-menu-btn"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl border transition-all shadow-xs cursor-pointer ${
          isAdmin
            ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border-amber-300 dark:border-amber-700/80 text-neutral-900 dark:text-white'
            : isAnalyst
            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 border-cyan-300 dark:border-cyan-700/80 text-neutral-900 dark:text-white'
            : isConsultant
            ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 border-emerald-300 dark:border-emerald-700/80 text-neutral-900 dark:text-white'
            : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 border-blue-300 dark:border-blue-700/80 text-neutral-900 dark:text-white'
        }`}
        title="Staff Account Options"
      >
        {/* Avatar Icon */}
        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
          isAdmin
            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/30'
            : isAnalyst
            ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/30'
            : isConsultant
            ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/30'
            : 'bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-blue-500/30'
        }`}>
          {isAdmin ? (
            <Crown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          ) : isAnalyst ? (
            <BarChart3 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          ) : isConsultant ? (
            <FileEdit className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          ) : (
            <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          )}
        </div>

        <div className="flex flex-col items-start text-left leading-none pr-0.5">
          <span className="font-['Chakra_Petch'] font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[75px] sm:max-w-[130px]">
            {activeStaff.displayName || activeStaff.username}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
              isAdmin 
                ? 'text-amber-600 dark:text-amber-400' 
                : isAnalyst 
                ? 'text-cyan-600 dark:text-cyan-400' 
                : isConsultant
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {roleText}
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center px-1 py-0.2 text-[8px] font-bold rounded-full bg-orange-500 text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Staff Account Dropdown Menu */}
      <AnimatePresence>
        {isOpen && isStaffMode && activeStaff && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#151722] rounded-2xl shadow-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden z-50 p-2 space-y-1.5"
          >
            {/* Header info */}
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                  isAdmin
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-sm shadow-amber-500/30'
                    : isAnalyst
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-sm shadow-cyan-500/30'
                    : isConsultant
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30'
                    : 'bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-sm shadow-blue-500/30'
                }`}>
                  {isAdmin ? (
                    <Crown className="w-4 h-4" />
                  ) : isAnalyst ? (
                    <BarChart3 className="w-4 h-4" />
                  ) : isConsultant ? (
                    <FileEdit className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                    {activeStaff.displayName || activeStaff.username}
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono flex items-center gap-1">
                    <span>@{activeStaff.username}</span>
                    <span>•</span>
                    <span className={
                      isAdmin 
                        ? 'text-amber-500 font-bold' 
                        : isAnalyst 
                        ? 'text-cyan-500 font-bold' 
                        : isConsultant
                        ? 'text-emerald-500 font-bold'
                        : 'text-blue-500 font-bold'
                    }>
                      {roleText}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-1 pt-0.5">
              <button
                onClick={handleOpenStaffPortal}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  {isConsultant ? (
                    <FileEdit className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                  )}
                  <span>{isConsultant ? 'Consultant Panel (Commentator Mode)' : 'Staff Dashboard'}</span>
                </div>
                {pendingCount > 0 && !isConsultant && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                    {pendingCount} pending
                  </span>
                )}
              </button>

              {canExport && (
                <button
                  onClick={handleOpenStaffPortal}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer text-left"
                >
                  <Download className="w-4 h-4 text-cyan-500" />
                  <span>Data Export Center</span>
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={handleOpenStaffPortal}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>Manage Staff Accounts</span>
                </button>
              )}

              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
