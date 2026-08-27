import { useState, useEffect } from 'react';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Users, Copy, Check, Award, RefreshCw,
  AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react';

export default function TeamTab({ user }) {
  const [copied, setCopied]           = useState(false);
  const [stats, setStats]             = useState(null);   // /team/stats
  const [business, setBusiness]       = useState(null);   // /team/business
  const [downlineData, setDownlineData] = useState(null); // /team/downline
  const [fetching, setFetching]       = useState(true);
  const [error, setError]             = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const referralCode = user?.referralCode || stats?.referralCode || '--------';

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const loadTeamData = async () => {
    setFetching(true);
    setError('');
    try {
      // Run all three in parallel; individual failures are captured below
      const [statsRes, busRes, downRes] = await Promise.allSettled([
        teamAPI.getStats(),
        teamAPI.getBusiness(),
        teamAPI.getDownline(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data ?? null);
      if (busRes.status   === 'fulfilled') setBusiness(busRes.value.data?.data ?? null);
      if (downRes.status  === 'fulfilled') setDownlineData(downRes.value.data?.data ?? null);

      // Surface the first error if all three failed
      const allFailed = [statsRes, busRes, downRes].every((r) => r.status === 'rejected');
      if (allFailed) {
        const msg = statsRes.reason?.response?.data?.message ?? 'Failed to load team data';
        setError(msg);
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load team data');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadTeamData(); }, []);

  const members         = downlineData?.downline ?? [];
  const filteredMembers = levelFilter === 'all'
    ? members
    : members.filter((m) => m.level === parseInt(levelFilter, 10));

  // Stats to show in the header cards — prefer /stats, fallback to /business
  const directCount    = stats?.directCount      ?? business?.legsCount ?? 0;
  const totalCount     = stats?.totalTeamCount   ?? downlineData?.totalDownlineCount ?? 0;
  const totalVolume    = business?.totalTeamVolume ?? 0;
  const strongVolume   = business?.strongTeamVolume ?? 0;
  const otherVolume    = business?.otherTeamVolume  ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-gold-400" size={24} /> My Referral Network
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Track your 25-level downline, leg volumes, and 60/40 rule qualifications.
          </p>
        </div>
        <button
          onClick={loadTeamData}
          disabled={fetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Referral Link Card */}
      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider block mb-1">
              Your Sponsor Code
            </span>
            <div className="text-2xl font-black text-white font-mono">{referralCode}</div>
            <p className="text-xs text-gray-500 mt-1">
              Share this code or link to earn 25-level team commissions
            </p>
          </div>
          <div className="flex items-center gap-2 max-w-md w-full">
            <input
              readOnly
              value={referralCode}
              className="flex-1 bg-dark-900 rounded-xl px-4 py-3 text-sm text-gold-400 border border-dark-500 font-mono font-bold tracking-widest text-center"
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

      {/* Summary stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-5 text-center">
          <div className="text-2xl font-extrabold text-gold-400">{fetching ? '—' : directCount}</div>
          <div className="text-xs text-gray-400 mt-1">Direct Referrals</div>
        </div>
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-5 text-center">
          <div className="text-2xl font-extrabold text-white">{fetching ? '—' : totalCount}</div>
          <div className="text-xs text-gray-400 mt-1">Total Downline</div>
        </div>
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-5 text-center">
          <div className="text-2xl font-extrabold text-blue-400">
            ${fetching ? '—' : Number(strongVolume).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Strongest Leg</div>
        </div>
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-5 text-center">
          <div className="text-2xl font-extrabold text-purple-400">
            ${fetching ? '—' : Number(totalVolume).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total Team Volume</div>
        </div>
      </div>

      {/* Team Volume & 60/40 */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <span className="text-xs text-gray-400 block mb-1 font-semibold uppercase">Total Team Volume</span>
          <div className="text-3xl font-black text-purple-400">
            ${Number(totalVolume).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-2">Combined across all 25 levels</p>
        </div>

        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-semibold uppercase">Strongest Leg</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">Max 60%</span>
          </div>
          <div className="text-3xl font-black text-blue-400">
            ${Number(strongVolume).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-2">Your largest referral leg</p>
        </div>

        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-semibold uppercase">Other Legs</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Min 40%</span>
          </div>
          <div className="text-3xl font-black text-emerald-400">
            ${Number(otherVolume).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-2">All remaining legs combined</p>
        </div>
      </div>

      {/* Direct legs detail (from /business) */}
      {business?.legs?.length > 0 && (
        <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
          <h3 className="font-bold text-white text-base mb-4">
            Direct Referral Legs ({business.legs.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-500 text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-right">Own Investment</th>
                  <th className="px-3 py-2 text-right">Leg Volume</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {business.legs.map((leg, i) => (
                  <tr key={leg.userId ?? i} className="hover:bg-dark-700/30 transition-colors">
                    <td className="px-3 py-3 font-semibold text-white">{leg.name}</td>
                    <td className="px-3 py-3 text-gray-400">{leg.email}</td>
                    <td className="px-3 py-3 font-mono text-gold-400">{leg.referralCode}</td>
                    <td className="px-3 py-3 text-right text-white font-semibold">
                      ${Number(leg.directInvestment).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-gold-400">
                      ${Number(leg.teamVolume).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      {leg.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <XCircle size={11} /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full downline tree */}
      <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award size={18} className="text-gold-400" /> Full Downline Tree
            </h3>
            <p className="text-xs text-gray-400">
              {fetching ? 'Loading…' : `${downlineData?.totalDownlineCount ?? 0} members across ${Object.keys(downlineData?.levelCounts ?? {}).length} levels`}
            </p>
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-dark-900 text-gray-300 text-xs rounded-xl px-3 py-2 border border-dark-500 focus:outline-none focus:border-gold-400"
          >
            <option value="all">All Levels (1–25)</option>
            {Array.from({ length: 25 }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={String(lvl)}>
                Level {lvl}{downlineData?.levelCounts?.[lvl] ? ` (${downlineData.levelCounts[lvl]})` : ''}
              </option>
            ))}
          </select>
        </div>

        {fetching ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading team downline…</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-dark-500 rounded-xl">
            <Users size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">
              {levelFilter === 'all'
                ? 'No downline members yet.'
                : `No members at Level ${levelFilter}.`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Share your referral link to grow your team!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/80 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Level</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3 text-right">Invested</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3 rounded-r-xl">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500/40 text-gray-300">
                {filteredMembers.map((m) => (
                  <tr key={String(m.id ?? m._id)} className="hover:bg-dark-700/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gold-400/10 text-gold-400 border border-gold-400/20">
                        L{m.level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white">{m.name}</td>
                    <td className="px-4 py-3.5 text-gray-400">{m.email}</td>
                    <td className="px-4 py-3.5 font-mono text-gold-300">{m.referralCode}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                      ${Number(m.totalInvestment ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      {m.isVerified ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <XCircle size={14} className="text-gray-600" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {new Date(m.joinedAt ?? m.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
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
