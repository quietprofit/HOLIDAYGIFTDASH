import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Flame,
  Gift,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { FamilyMember, GiftItem, ListStatus } from '../types/holiday';
import {
  deleteFamilyMember,
  saveFamilyMember,
  updateMemberListStatus,
} from '../lib/holidayService';
import { BlushPinkTreeIcon, GirlyGingerbreadCookieIcon } from './HolidayVisualElements';

interface NaughtyNiceViewProps {
  uid: string;
  members: FamilyMember[];
  gifts: GiftItem[];
  onFindGiftForMember: (memberId: string) => void;
  onBackToCommandCenter?: () => void;
}

const STATUS_META: Record<ListStatus, { label: string; colorClass: string }> = {
  nice: {
    label: 'Nice List',
    colorClass: 'text-[#1D6B3C] dark:text-[#4ADE80]',
  },
  naughty: {
    label: 'Naughty List',
    colorClass: 'text-[#9E1B24] dark:text-[#FB7185]',
  },
  undecided: {
    label: 'Checking Twice',
    colorClass: 'text-[#B45309] dark:text-[#FBBF24]',
  },
};

export const NaughtyNiceView: React.FC<NaughtyNiceViewProps> = ({
  uid,
  members,
  gifts,
  onFindGiftForMember,
  onBackToCommandCenter,
}) => {
  const [filter, setFilter] = useState<'all' | ListStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Grandchild');
  const [ageGroup, setAgeGroup] = useState('Adult');
  const [listStatus, setListStatus] = useState<ListStatus>('nice');
  const [budgetAllocated, setBudgetAllocated] = useState('75');
  const [interests, setInterests] = useState('');
  const [niceDeeds, setNiceDeeds] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    return {
      all: members.length,
      nice: members.filter((m) => m.listStatus === 'nice').length,
      naughty: members.filter((m) => m.listStatus === 'naughty').length,
      undecided: members.filter((m) => m.listStatus === 'undecided').length,
    };
  }, [members]);

  const filtered = useMemo(() => {
    if (filter === 'all') return members;
    return members.filter((m) => m.listStatus === filter);
  }, [members, filter]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setRelationship('Grandchild');
    setAgeGroup('Child');
    setListStatus('nice');
    setBudgetAllocated('75');
    setInterests('');
    setNiceDeeds('');
    setNotes('');
    setShowModal(true);
  };

  const openEdit = (m: FamilyMember) => {
    setEditing(m);
    setName(m.name);
    setRelationship(m.relationship);
    setAgeGroup(m.ageGroup);
    setListStatus(m.listStatus);
    setBudgetAllocated(String(m.budgetAllocated));
    setInterests(m.interests);
    setNiceDeeds(m.niceDeeds);
    setNotes(m.notes);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveFamilyMember(uid, {
        id: editing?.id,
        name,
        relationship,
        ageGroup,
        listStatus,
        budgetAllocated: Number(budgetAllocated) || 0,
        interests,
        niceDeeds,
        notes,
      });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {onBackToCommandCenter && (
        <button
          type="button"
          onClick={onBackToCommandCenter}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#9E1B24] dark:hover:text-[#FB7185] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Command Center</span>
        </button>
      )}

      {/* Editorial Page Header */}
      <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <GirlyGingerbreadCookieIcon className="w-11 h-11 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
              Friends &amp; Family Roster
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
              Naughty &amp; Nice List
            </h1>
            <p className="text-xs sm:text-sm text-[#7D6959] dark:text-[#C4B0A2]">
              Manage Nice, Checking Twice, and Naughty toggles, individual budgets, clothing sizes, and assigned gifts.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Friend or Family</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30]">
          {(['all', 'nice', 'undecided', 'naughty'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filter === key
                  ? 'bg-[#FBF0F3] dark:bg-[#2B1D22] text-[#9E1B24] dark:text-[#FB7185]'
                  : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-white'
              }`}
            >
              {key === 'all' ? 'Everyone' : STATUS_META[key].label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-12 text-center space-y-3">
          <BlushPinkTreeIcon className="w-12 h-12 mx-auto" />
          <p className="text-sm font-semibold text-[#26181C] dark:text-[#F5EFE8]">
            No friends or family in this list yet
          </p>
          <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] max-w-md mx-auto">
            Add children, grandchildren, siblings, neighbors, or best friends to organize their wishlists and Naughty or Nice status.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9E1B24] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Recipient
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((member) => {
            const memberGifts = gifts.filter((g) => g.memberId === member.id);
            const spent = memberGifts.reduce(
              (sum, g) => sum + (g.actualPrice > 0 ? g.actualPrice : g.estimatedPrice),
              0
            );
            const statusInfo = STATUS_META[member.listStatus];
            const overBudget = member.budgetAllocated > 0 && spent > member.budgetAllocated;

            return (
              <div
                key={member.id}
                className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8] truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                        {member.relationship} · {member.ageGroup} ·{' '}
                        <span className={`font-semibold ${statusInfo.colorClass}`}>
                          {statusInfo.label}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(member)}
                        aria-label={`Edit ${member.name}`}
                        className="p-1.5 rounded-lg text-[#7D6959] hover:text-[#26181C] hover:bg-[#FAF6F0] dark:hover:bg-[#2B1D22] cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFamilyMember(uid, member.id)}
                        aria-label={`Remove ${member.name}`}
                        className="p-1.5 rounded-lg text-[#7D6959] hover:text-[#9E1B24] hover:bg-[#FAF6F0] dark:hover:bg-[#2B1D22] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Nice / Checking Twice / Naughty Switcher */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30]">
                    <button
                      type="button"
                      onClick={() => updateMemberListStatus(uid, member.id, 'nice')}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        member.listStatus === 'nice'
                          ? 'bg-[#1D6B3C]/15 text-[#1D6B3C] dark:text-[#4ADE80]'
                          : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Nice
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMemberListStatus(uid, member.id, 'undecided')}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        member.listStatus === 'undecided'
                          ? 'bg-[#B45309]/15 text-[#B45309] dark:text-[#FBBF24]'
                          : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-white'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Checking Twice
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMemberListStatus(uid, member.id, 'naughty')}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        member.listStatus === 'naughty'
                          ? 'bg-[#9E1B24]/15 text-[#9E1B24] dark:text-[#FB7185]'
                          : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-white'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Naughty
                    </button>
                  </div>

                  {/* Sizes, Interests & Notes */}
                  <div className="space-y-1.5 text-xs text-[#26181C] dark:text-[#F5EFE8]">
                    {member.interests && (
                      <p>
                        <span className="font-semibold text-[#7D6959] dark:text-[#C4B0A2]">Interests:</span>{' '}
                        {member.interests}
                      </p>
                    )}
                    {member.niceDeeds && (
                      <p>
                        <span className="font-semibold text-[#7D6959] dark:text-[#C4B0A2]">Notes &amp; Deeds:</span>{' '}
                        {member.niceDeeds}
                      </p>
                    )}
                    {member.notes && (
                      <p>
                        <span className="font-semibold text-[#7D6959] dark:text-[#C4B0A2]">Sizes &amp; Details:</span>{' '}
                        {member.notes}
                      </p>
                    )}
                  </div>

                  {/* Assigned Gifts for this Recipient */}
                  <div className="rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
                        Assigned Gifts ({memberGifts.length})
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          overBudget
                            ? 'text-[#9E1B24] dark:text-[#FB7185]'
                            : 'text-[#1D6B3C] dark:text-[#4ADE80]'
                        }`}
                      >
                        ${spent.toFixed(0)} / ${member.budgetAllocated.toFixed(0)} budget
                      </span>
                    </div>

                    {memberGifts.length === 0 ? (
                      <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                        No gifts assigned yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {memberGifts.map((g) => (
                          <div key={g.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-[#26181C] dark:text-[#F5EFE8]">
                              • {g.title}
                            </span>
                            <span className="tabular-nums text-[#7D6959] dark:text-[#C4B0A2] shrink-0">
                              ${(g.actualPrice > 0 ? g.actualPrice : g.estimatedPrice).toFixed(0)} · {g.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E4D7C5] dark:border-[#3A2C30] flex items-center justify-between gap-3">
                  <div className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
                    <span>{overBudget ? 'Over recipient budget' : 'On budget'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFindGiftForMember(member.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Find Gift Ideas →</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                {editing ? 'Edit Friend or Family Member' : "Add to Santa's Naughty or Nice List"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#7D6959] hover:bg-[#FAF6F0] dark:hover:bg-[#2B1D22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Granddaughter Maya"
                    maxLength={80}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Relationship</label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Daughter, Best Friend, Neighbor..."
                    maxLength={60}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Age Group</label>
                  <input
                    type="text"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    placeholder="Toddler, Teen, Adult..."
                    maxLength={40}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">List Status</label>
                  <select
                    value={listStatus}
                    onChange={(e) => setListStatus(e.target.value as ListStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  >
                    <option value="nice">Nice List</option>
                    <option value="undecided">Checking Twice</option>
                    <option value="naughty">Naughty List</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Budget ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={budgetAllocated}
                    onChange={(e) => setBudgetAllocated(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Interests &amp; Hobbies</label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="LEGO sets, baking, cozy blankets, mystery novels..."
                  maxLength={300}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Nice Deeds / Behavior Notes</label>
                <input
                  type="text"
                  value={niceDeeds}
                  onChange={(e) => setNiceDeeds(e.target.value)}
                  placeholder="Helped shovel walk, shared toys with sister..."
                  maxLength={300}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Clothing Sizes &amp; Allergies</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={400}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editing ? 'Update Person' : 'Save Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
