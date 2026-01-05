import React, { useEffect, useState } from 'react';
import { DataService } from '../services/mockService';
import { User, Poll } from '../types';
import { Crown, Beer, Eye, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '../App';
import { UserDetailModal } from '../components/UserDetailModal';

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    Promise.all([
        DataService.getUsers(),
        DataService.getPolls()
    ]).then(([usersData, pollsData]) => {
        setUsers(usersData);
        setPolls(pollsData);
        setLoading(false);
    });
  }, []);

  // Calculate scores
  const userStats = users.map(u => {
      // 1. Attendance Count
      const attendanceCount = polls.filter(p => p.confirmedAttendances?.includes(u.id)).length;
      
      // 2. Vote Count
      const voteCount = polls.filter(p => {
          const hasVotedTime = (p.timeOptions || []).some(opt => opt.votes.includes(u.id));
          const hasVotedLoc = p.options.some(opt => opt.votes.includes(u.id));
          return hasVotedTime && hasVotedLoc;
      }).length;

      // 3. Total Money Spent
      const totalMoney = polls.reduce((sum, poll) => {
          if (poll.bill && poll.bill.items[u.id]) {
              const item = poll.bill.items[u.id];
              return sum + (item.amount || 0) + (item.round2Amount || 0);
          }
          return sum;
      }, 0);

      return {
          ...u,
          attendance: attendanceCount,
          voteScore: voteCount,
          totalMoney: totalMoney
      };
  }).sort((a, b) => {
      // Priority 1: Money
      if (b.totalMoney !== a.totalMoney) return b.totalMoney - a.totalMoney;
      // Priority 2: Attendance
      if (b.attendance !== a.attendance) return b.attendance - a.attendance;
      // Priority 3: Vote Count
      return b.voteScore - a.voteScore; 
  });

  // Calculate Rank (handle ties)
  let currentRank = 1;
  const rankedUsers = userStats.map((u, index) => {
      if (index > 0) {
          const prev = userStats[index - 1];
          // If scores are different, update rank to current position (index + 1)
          if (u.totalMoney !== prev.totalMoney || u.attendance !== prev.attendance || u.voteScore !== prev.voteScore) {
              currentRank = index + 1;
          }
      }
      return { ...u, rank: currentRank };
  });

  const top3 = rankedUsers.slice(0, 3);
  const others = rankedUsers.slice(3);

  if (loading) return <div className="text-center py-20">Đang tính điểm...</div>;

  return (
    <div className="flex flex-col gap-8 pb-20">
        <UserDetailModal 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
            allPolls={polls}
            currentUserRole={user?.role}
            // Read-only mode for leaderboard
        />

        <div className="text-center py-8">
            <Crown size={64} className="text-primary mx-auto mb-4 animate-bounce" />
            <h1 className="text-4xl font-black text-white mb-2">BXH Đại Gia Chân Đất</h1>
            <p className="text-secondary">Vinh danh các nhà tài trợ vàng cho quán nhậu</p>
        </div>

        {/* Top 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-8 max-w-5xl mx-auto w-full">
            {top3.map((u, idx) => (
                <div key={u.id} 
                    className={`bg-surface border border-border rounded-2xl p-6 flex flex-col items-center relative cursor-pointer hover:-translate-y-2 transition-transform ${u.rank === 1 ? 'order-2 h-96 border-primary shadow-[0_0_30px_rgba(244,140,37,0.2)]' : 'h-80 order-1 md:order-none'}`}
                    onClick={() => setSelectedUser(u)}
                >
                    <div className="absolute -top-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black border-4 border-surface shadow-lg ${u.rank === 1 ? 'bg-yellow-400 text-black text-xl' : u.rank === 2 ? 'bg-gray-300 text-black' : 'bg-orange-700 text-white'}`}>
                            {u.rank}
                        </div>
                    </div>
                    <img src={u.avatar} className="w-24 h-24 rounded-full border-4 border-background mb-4 mt-6 object-cover" />
                    <h3 className="text-xl font-bold text-white text-center">{u.nickname}</h3>
                    <p className="text-secondary text-sm mb-2 text-center line-clamp-1 italic">"{u.quote}"</p>
                    
                    <div className="mt-auto flex flex-col items-center gap-3 w-full">
                        <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30 w-full justify-center">
                            <DollarSign size={20} />
                            <span className="font-black text-lg">{u.totalMoney.toLocaleString()}k</span>
                        </div>
                        <div className="flex justify-between w-full text-xs text-secondary px-4">
                             <div className="flex items-center gap-1"><Beer size={12}/> {u.attendance} kèo</div>
                             <div className="flex items-center gap-1"><CheckCircle size={12}/> {u.voteScore} vote</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* List of others */}
        <div className="bg-surface rounded-3xl border border-border overflow-hidden max-w-4xl mx-auto w-full">
            <table className="w-full text-left text-sm text-secondary">
                <thead className="bg-background text-xs uppercase font-bold text-white">
                    <tr>
                        <th className="px-6 py-4 w-16 text-center">#</th>
                        <th className="px-6 py-4">Dân chơi</th>
                        <th className="px-6 py-4 text-center">Đã chi (k)</th>
                        <th className="px-6 py-4 text-center">Tham gia</th>
                        <th className="px-6 py-4 text-center">Vote</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {others.map((u) => (
                        <tr key={u.id} className="hover:bg-background/50 cursor-pointer transition-colors" onClick={() => setSelectedUser(u)}>
                            <td className="px-6 py-4 text-center font-bold text-white/50">{u.rank}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <img src={u.avatar} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <div className="font-bold text-white">{u.nickname}</div>
                                        <div className="text-xs">{u.name}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">{u.totalMoney.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="text-secondary">{u.attendance}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="text-secondary text-xs">{u.voteScore}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default Leaderboard;