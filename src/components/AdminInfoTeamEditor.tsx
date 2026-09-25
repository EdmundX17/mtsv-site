import React, { useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { SiteInfoConfig, TeamMemberEntry } from '../types';
import { Save, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminInfoTeamEditor: React.FC = () => {
  const { siteInfo, updateSiteInfo, isAdmin } = useValueList();

  const [formData, setFormData] = useState<SiteInfoConfig>(() => ({
    title: siteInfo?.title || '',
    description: siteInfo?.description || '',
    announcement: siteInfo?.announcement || '',
    bulletPoints: siteInfo?.bulletPoints || [],
    discordUrl: siteInfo?.discordUrl || '',
    robloxGroupUrl: siteInfo?.robloxGroupUrl || '',
    teamMembers: siteInfo?.teamMembers || []
  }));

  const [bulletInput, setBulletInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Team member form state
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberBadge, setMemberBadge] = useState<TeamMemberEntry['badgeColor']>('orange');

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-neutral-400 text-xs">
        Admin privileges required to edit site metadata.
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await updateSiteInfo(formData);
      setSuccessMsg('Site information updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save site info.');
    } finally {
      setIsSaving(false);
    }
  };

  const addBulletPoint = () => {
    if (!bulletInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      bulletPoints: [...prev.bulletPoints, bulletInput.trim()]
    }));
    setBulletInput('');
  };

  const removeBulletPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bulletPoints: prev.bulletPoints.filter((_, i) => i !== index)
    }));
  };

  const addTeamMember = () => {
    if (!memberName.trim()) return;
    const newMember: TeamMemberEntry = {
      id: `member_${Date.now()}`,
      name: memberName.trim(),
      role: memberRole.trim() || 'Staff Member',
      badgeColor: memberBadge
    };
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, newMember]
    }));
    setMemberName('');
    setMemberRole('');
  };

  const removeTeamMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.id !== id)
    }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#30363d]">
        <div>
          <h3 className="font-bold text-base text-neutral-900 dark:text-white">
            Site Information & Team Editor
          </h3>
          <p className="text-xs text-neutral-500">
            Customize branding, announcement banners, bullet points, and leadership team members.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Site Header Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
          />
        </div>

        {/* Announcement */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Announcement Banner (Optional)
          </label>
          <input
            type="text"
            value={formData.announcement || ''}
            onChange={e => setFormData({ ...formData, announcement: e.target.value })}
            placeholder="e.g. Major game update released! Check new helicopter values."
            className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
          />
        </div>

        {/* Bullet Points */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Featured Highlights / Bullets
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={bulletInput}
              onChange={e => setBulletInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBulletPoint())}
              placeholder="Add key feature point..."
              className="grow px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
            />
            <button
              type="button"
              onClick={addBulletPoint}
              className="px-4 py-2 bg-neutral-200 dark:bg-[#21262d] hover:bg-neutral-300 dark:hover:bg-[#30363d] text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold"
            >
              Add
            </button>
          </div>
          <div className="space-y-1.5">
            {formData.bulletPoints.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] rounded-xl text-xs"
              >
                <span>{b}</span>
                <button
                  type="button"
                  onClick={() => removeBulletPoint(idx)}
                  className="text-neutral-400 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="pt-2 border-t border-neutral-200 dark:border-[#30363d]">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Team Members
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <input
              type="text"
              value={memberName}
              onChange={e => setMemberName(e.target.value)}
              placeholder="Staff Name"
              className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
            />
            <input
              type="text"
              value={memberRole}
              onChange={e => setMemberRole(e.target.value)}
              placeholder="Role (e.g. Lead Analyst)"
              className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:border-orange-500"
            />
            <button
              type="button"
              onClick={addTeamMember}
              className="py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Add Member
            </button>
          </div>

          <div className="space-y-2">
            {formData.teamMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] rounded-xl text-xs"
              >
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">{member.name}</span>
                  <span className="text-neutral-500">{member.role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTeamMember(member.id)}
                  className="text-neutral-400 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
