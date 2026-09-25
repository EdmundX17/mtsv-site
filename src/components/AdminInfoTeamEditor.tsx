import React, { useState, useEffect } from 'react';
import { useValueList } from '../context/ValueListContext';
import { SiteInfoConfig, TeamMemberEntry } from '../types';
import { 
  Info, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  Save, 
  Flame, 
  MessageSquare, 
  Gamepad2, 
  ShieldCheck, 
  ArrowUp, 
  ArrowDown, 
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

const BADGE_COLORS: Array<{ id: TeamMemberEntry['badgeColor']; label: string; bgClass: string }> = [
  { id: 'orange', label: 'Orange (Lead/Founder)', bgClass: 'bg-orange-500 text-white' },
  { id: 'purple', label: 'Purple (Head Valuer/Admin)', bgClass: 'bg-purple-600 text-white' },
  { id: 'blue', label: 'Blue (Air/Combat Specialist)', bgClass: 'bg-blue-600 text-white' },
  { id: 'emerald', label: 'Emerald (Naval Analyst)', bgClass: 'bg-emerald-600 text-white' },
  { id: 'rose', label: 'Rose (Staff/Supervisor)', bgClass: 'bg-rose-600 text-white' },
  { id: 'cyan', label: 'Cyan (Tech/Developer)', bgClass: 'bg-cyan-600 text-white' },
  { id: 'amber', label: 'Amber (Senior Staff)', bgClass: 'bg-amber-500 text-white' },
];

export const AdminInfoTeamEditor: React.FC = () => {
  const { siteInfo, updateSiteInfo, resetSiteInfoToDefault, isAdmin } = useValueList();

  const [form, setForm] = useState<SiteInfoConfig>(siteInfo);
  const [newBullet, setNewBullet] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Member Modal State
  const [editingMember, setEditingMember] = useState<TeamMemberEntry | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberFormData, setMemberFormData] = useState<TeamMemberEntry>({
    id: '',
    name: '',
    role: 'Staff Valuer',
    discord: '',
    robloxUsername: '',
    bio: '',
    badgeColor: 'orange'
  });

  // Keep form in sync when siteInfo updates from database
  useEffect(() => {
    setForm(siteInfo);
  }, [siteInfo]);

  const handleAddBullet = () => {
    if (!newBullet.trim()) return;
    setForm(prev => ({
      ...prev,
      bulletPoints: [...(prev.bulletPoints || []), newBullet.trim()]
    }));
    setNewBullet('');
  };

  const handleRemoveBullet = (index: number) => {
    setForm(prev => ({
      ...prev,
      bulletPoints: prev.bulletPoints.filter((_, idx) => idx !== index)
    }));
  };

  const handleOpenAddMember = () => {
    setMemberFormData({
      id: `team-${Date.now()}`,
      name: '',
      role: 'Staff Valuer',
      discord: '',
      robloxUsername: '',
      bio: '',
      badgeColor: 'orange'
    });
    setIsAddingMember(true);
    setEditingMember(null);
  };

  const handleOpenEditMember = (member: TeamMemberEntry) => {
    setMemberFormData({ ...member });
    setEditingMember(member);
    setIsAddingMember(false);
  };

  const handleSaveMemberModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFormData.name.trim()) return;

    if (isAddingMember) {
      setForm(prev => ({
        ...prev,
        teamMembers: [...(prev.teamMembers || []), memberFormData]
      }));
      setIsAddingMember(false);
    } else if (editingMember) {
      setForm(prev => ({
        ...prev,
        teamMembers: prev.teamMembers.map(m => m.id === editingMember.id ? memberFormData : m)
      }));
      setEditingMember(null);
    }
  };

  const handleDeleteMember = (id: string) => {
    setForm(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.id !== id)
    }));
  };

  const handleMoveMember = (index: number, direction: 'up' | 'down') => {
    const list = [...form.teamMembers];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setForm(prev => ({ ...prev, teamMembers: list }));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setSaveError('Permission Denied: Only Admins can modify site information and team listings.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSiteInfo(form);

      // Pre-prime translation into persistent cache so Spanish readers experience zero delay
      const textsToPrime: string[] = [];
      if (form.description?.trim()) textsToPrime.push(form.description.trim());
      if (form.announcement?.trim()) textsToPrime.push(form.announcement.trim());
      form.teamMembers.forEach(m => {
        if (m.bio?.trim()) textsToPrime.push(m.bio.trim());
      });
      if (textsToPrime.length > 0) {
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: textsToPrime, targetLang: 'es' })
        }).catch(() => {});
      }

      setSaveSuccess(true);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save site information.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset the Information & Our Team section back to initial defaults?')) return;
    setIsSaving(true);
    try {
      await resetSiteInfoToDefault();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to reset.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-tight">
              Information & "Our Team" Editor (Admin Only)
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Customize the public information section, announcement banner, bullet highlights, and official team directory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Site Information & Team directory updated and synced to Firestore!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* SECTION 1: Information Block Settings */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#181c2b] border border-orange-200/70 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-500" />
              <h4 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase">
                1. Left Column: Information Section Details
              </h4>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[11px] font-mono font-semibold">
              <Sparkles className="w-3 h-3 text-orange-500" />
              <span>Auto-translated with AI</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Section Title
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. About Military Tycoon Services"
                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Overview Description
              </label>
              <textarea
                rows={3}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Provide a clear, helpful description of the valuation list..."
                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Announcement Banner Text <span className="text-[10px] font-normal text-neutral-400">(Optional highlight box)</span>
              </label>
              <div className="relative">
                <Flame className="w-4 h-4 text-orange-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={form.announcement || ''}
                  onChange={(e) => setForm({ ...form, announcement: e.target.value })}
                  placeholder="e.g. Season 7 Naval vehicles & Star Tier recalculation live."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bullet Points */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                Key Highlights & Features (Bullet Points)
              </label>
              <div className="space-y-2 mb-2">
                {form.bulletPoints && form.bulletPoints.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const updated = [...form.bulletPoints];
                        updated[idx] = e.target.value;
                        setForm({ ...form, bulletPoints: updated });
                      }}
                      className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Remove bullet point"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBullet}
                  onChange={(e) => setNewBullet(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBullet(); } }}
                  placeholder="Add another highlight bullet..."
                  className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Highlight</span>
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Discord Server URL
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-[#5865F2] absolute left-3.5 top-3" />
                  <input
                    type="url"
                    value={form.discordUrl || 'https://discord.gg/yenZH7FaXU'}
                    onChange={(e) => setForm({ ...form, discordUrl: e.target.value })}
                    placeholder="https://discord.gg/yenZH7FaXU"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: "Our Team" Directory Settings */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#181c2b] border border-purple-200/70 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <h4 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase">
                2. Right Column: "Our Team" Staff Directory ({form.teamMembers?.length || 0})
              </h4>
            </div>

            <button
              type="button"
              onClick={handleOpenAddMember}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Team Member</span>
            </button>
          </div>

          {/* Members List */}
          <div className="space-y-2.5">
            {form.teamMembers && form.teamMembers.length > 0 ? (
              form.teamMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200/70 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold font-['Chakra_Petch'] text-sm flex items-center justify-center shrink-0">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                          {member.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          BADGE_COLORS.find(b => b.id === member.badgeColor)?.bgClass || 'bg-orange-500 text-white'
                        }`}>
                          {member.role}
                        </span>
                      </div>

                      {member.bio && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {member.bio}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-neutral-400">
                        {member.discord && <span>Discord: @{member.discord}</span>}
                        {member.robloxUsername && <span>Roblox: {member.robloxUsername}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveMember(index, 'up')}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === form.teamMembers.length - 1}
                      onClick={() => handleMoveMember(index, 'down')}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditMember(member)}
                      className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/40 cursor-pointer"
                      title="Edit Member"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Delete Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-neutral-400 border border-dashed rounded-2xl">
                No team members listed yet. Click "+ Add Team Member" to get started.
              </div>
            )}
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            {isSaving ? 'Syncing to Firestore...' : 'Changes will reflect instantly on the public website'}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save & Publish Live Changes</span>
          </button>
        </div>
      </form>

      {/* TEAM MEMBER MODAL (Add / Edit) */}
      {(isAddingMember || editingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#181c2b] border border-purple-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white">
                {isAddingMember ? 'Add Team Member' : `Edit Member: ${memberFormData.name}`}
              </h4>
              <button
                type="button"
                onClick={() => { setIsAddingMember(false); setEditingMember(null); }}
                className="text-neutral-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMemberModal} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300 uppercase">
                  Staff / Roblox Name
                </label>
                <input
                  type="text"
                  required
                  value={memberFormData.name}
                  onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                  placeholder="e.g. Commander_Rex"
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300 uppercase">
                    Role Title
                  </label>
                  <input
                    type="text"
                    required
                    value={memberFormData.role}
                    onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                    placeholder="e.g. Head Valuer & Admin"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300 uppercase">
                    Badge Color
                  </label>
                  <select
                    value={memberFormData.badgeColor || 'orange'}
                    onChange={(e) => setMemberFormData({ ...memberFormData, badgeColor: e.target.value as any })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  >
                    {BADGE_COLORS.map(b => (
                      <option key={b.id} value={b.id}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300 uppercase">
                    Discord Tag
                  </label>
                  <input
                    type="text"
                    value={memberFormData.discord || ''}
                    onChange={(e) => setMemberFormData({ ...memberFormData, discord: e.target.value })}
                    placeholder="e.g. rex_mts"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300 uppercase">
                    Roblox Username
                  </label>
                  <input
                    type="text"
                    value={memberFormData.robloxUsername || ''}
                    onChange={(e) => setMemberFormData({ ...memberFormData, robloxUsername: e.target.value })}
                    placeholder="e.g. Commander_Rex"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-neutral-700 dark:text-neutral-300 uppercase">
                  Bio / Responsibilities
                </label>
                <textarea
                  rows={2}
                  value={memberFormData.bio || ''}
                  onChange={(e) => setMemberFormData({ ...memberFormData, bio: e.target.value })}
                  placeholder="Oversees market trend analysis, vehicle demand metrics..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAddingMember(false); setEditingMember(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer transition-colors shadow-md shadow-purple-500/20"
                >
                  {isAddingMember ? 'Add Member' : 'Update Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
