import { useState, useEffect } from 'react';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Copy, Check, ShieldCheck, Award, RefreshCw, ChevronRight } from 'lucide-react';

export default function TeamTab({ user }) {
  const [copied, setCopied] = useState(false);
  const [business, setBusiness] = useState(null);
  const [downlineData, setDownlineData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');

  const referralCode = user?.referralCode || '--------';

  const copyReferral = () => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const loadTeamData = async () => {
    try {
      setFetching(true);
      const [busRes, downRes] = await Promise.all([
        teamAPI.getBusiness().catch(() => null),
        teamAPI.getDownline().catch(() => null),
      ]);

      if (busRes) setBusiness(busRes.data.data);
      if (downRes) setDownlineData(downRes.data.data);
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, []);

  const members = downlineData?.downline || [];
  const filteredMembers = levelFilter === 'all'
    ? members
    : members.filter(m => m.level === parseInt(levelFilter, 10));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-gold-400" /> My Referral Network
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Track your 25-level downline genealogy, leg business volume, and 60/40 rule qualifications.
        </p>
      </div>

      {/* Referral Link Card */}
      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider block mb-1">Your Sponsor Code</span>
            <div className="text-2xl font-black text-white font-mono">{referralCode}</div>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full">
            <input
              readOnly
              value={`${window.location.origin}/register?ref=${referralCode}`}
              className="flex-1 bg-dark-900 rounded-xl px-4 py-3 text-xs text-gray-300 border border-dark-500 font-mono truncate"
            />
            <button
              onClick={copyReferral}
              className="px-5 py-3 rounded-xl bg-gold-400 text-dark-900 font-bold text-xs flex items-center gap-1.5 hover:bg-gold-300 transition-colors shrink-0"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Team Volume & 60/40 Breakdown */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <span className="text-xs text-gray-400 block mb-1 font-semibold uppercase">Total Team Volume</span>
          <div className="text-3xl font-black text-purple-400">
            ${Number(business?.totalTeamVolume || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-2">Combined volume across all 25 levels</p>
        </div>

        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-semibold uppercase">Strongest Leg (Max 60%)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">Leg 1</span>
          </div>
          <div className="text-3xl font-black text-blue-400">
            ${Number(business?.strongTeamVolume || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-2">Volume from your largest referral leg</p>
        </div>

        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-semibold uppercase">Other Legs (Min 40%)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Remaining</span>
          </div>
          <div className="text-3xl font-black text-emerald-400">
            ${Number(business?.otherTeamVolume || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-2">Volume from all other referral legs</p>
        </div>
      </div>

      {/* Downline Tree Table */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award size={18} className="text-gold-400" /> Downline Team Tree
            </h3>
            <p className="text-xs text-gray-400">Total downline count: {downlineData?.totalDownlineCount || 0} members</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-dark-900 text-gray-300 text-xs rounded-xl px-3 py-2 border border-dark-500 focus:outline-none"
            >
              <option value="all">All Levels (1 - 25)</option>
              {Array.from({ length: 25 }, (_, i) => i + 1).map((lvl) => (
                <option key={lvl} value={lvl.toString()}>Level {lvl}</option>
              ))}
            </select>

            <button
              onClick={loadTeamData}
              className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
              title="Refresh downline"
            >
              <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {fetching ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading team downline...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-dark-500 rounded-xl">
            <p className="text-gray-400 text-sm">No downline members found for this level filter.</p>
            <p className="text-xs text-gray-500 mt-1">Share your referral link above to grow your team!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/80 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Level</th>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Referral Code</th>
                  <th className="px-4 py-3">Total Invested</th>
                  <th className="px-4 py-3 rounded-r-xl">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500/40 text-gray-300">
                {filteredMembers.map((m) => (
                  <tr key={m.id || m._id} className="hover:bg-dark-700/30">
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gold-400/10 text-gold-400 border border-gold-400/20">
                        Level {m.level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white">{m.name}</td>
                    <td className="px-4 py-3.5 text-gray-400">{m.email}</td>
                    <td className="px-4 py-3.5 font-mono text-gold-300">{m.referralCode}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-400">${Number(m.totalInvestment || 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {new Date(m.joinedAt || m.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
