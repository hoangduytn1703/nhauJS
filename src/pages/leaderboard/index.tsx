import React,{ useEffect,useState } from 'react';
import { DataService } from '@/core/services/mockService';
import { User,Poll,UserRole } from '@/core/types/types';
import { Crown,Beer,Eye,CheckCircle,DollarSign,AlertTriangle } from 'lucide-react';
import { useAuth } from '@/core/hooks';
import { UserDetailModal } from '@/components/UserDetailModal';

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [users,setUsers] = useState<User[]>([]);
  const [polls,setPolls] = useState<Poll[]>([]);
  const [loading,setLoading] = useState(true);
  const [selectedUser,setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    refreshData();
  },[]);

  const refreshData = () => {
    Promise.all([
      DataService.getUsers(),
      DataService.getPolls()
    ]).then(([usersData,pollsData]) => {
      setUsers(usersData);
      setPolls(pollsData);
      setLoading(false);
    });
  }

  // --- ENABLE CHECK-IN FOR ADMIN ---
  const handleToggleAttendance = async (pollId: string,userId: string) => {
    if (user?.role !== UserRole.ADMIN) return;
    try {
      await DataService.toggleAttendance(pollId,userId);
      // Optimistic update for poll
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p;
        let attended = p.confirmedAttendances || [];
        if (attended.includes(userId)) {
          attended = attended.filter(id => id !== userId);
        } else {
          attended = [...attended,userId];
        }
        return { ...p,confirmedAttendances: attended };
      }));
      // Refresh all data to sync flake counts correctly
      refreshData();
      if (selectedUser && selectedUser.id === userId) {
        const updatedUser = await DataService.getUser(userId);
        setSelectedUser(updatedUser);
      }
    } catch (e) {
      alert('Lỗi khi cập nhật tham gia');
    }
  };

  const handleToggleFlake = async (pollId: string,userId: string) => {
    if (user?.role !== UserRole.ADMIN) return;
    try {
      await DataService.toggleFlake(pollId,userId);
      refreshData();
      if (selectedUser && selectedUser.id === userId) {
        const updatedUser = await DataService.getUser(userId);
        setSelectedUser(updatedUser);
      }
    } catch (e) {
      alert('Lỗi khi cập nhật bùng kèo');
    }
  };

  const handleToggleNonDrinker = async (pollId: string,userId: string) => {
    if (user?.role !== UserRole.ADMIN) return;
    try {
      await DataService.toggleNonDrinker(pollId,userId);
      refreshData();
    } catch (e) {
      alert('Lỗi khi cập nhật trạng thái nhậu');
    }
  };

  // Calculate scores
  const userStats = users
    .filter(u => u.role !== 'ADMIN') // Exclude Admins from Leaderboard
    .map(u => {
      // 1. Attendance Count (Admin Confirmed + Manual Offset)
      const realAttendance = polls.filter(p => p.confirmedAttendances?.includes(u.id)).length;
      const totalAttendance = Math.max(0,realAttendance + (u.attendanceOffset || 0));

      // 2. Vote Count (Calculated + Manual Offset)
      const realVoteCount = polls.filter(p => {
        const hasVotedTime = (p.timeOptions || []).some(opt => opt.votes.includes(u.id));
        const hasVotedLoc = p.options.some(opt => opt.votes.includes(u.id));
        return hasVotedTime && hasVotedLoc;
      }).length;
      const totalVoteCount = Math.max(0,realVoteCount + (u.voteOffset || 0));

      // 3. Total Money Spent
      const totalMoney = polls.reduce((sum,poll) => {
        if (poll.bill && poll.bill.items[u.id]) {
          const item = poll.bill.items[u.id];
          return sum + (item.amount || 0) + (item.round2Amount || 0);
        }
        return sum;
      },0);

      // 4. Flake Penalty Calculation
      // "mỗi lần bùng bằng 0.5 lần tham gia" -> Deduct 0.5 from attendance score for ranking
      // flakeCount is directly editable by Admin and auto-updated by logic
      const flakes = Math.max(0,u.flakeCount || 0);

      // Effective Score for Ranking
      const effectiveAttendanceScore = totalAttendance - (flakes * 0.5);

      return {
        ...u,
        attendance: totalAttendance,
        flakeCount: flakes,
        voteScore: totalVoteCount,
        totalMoney: totalMoney,
        effectiveAttendanceScore
      };
    }).sort((a,b) => {
      // Priority 1: Money (Đại Gia Leaderboard)
      if (b.totalMoney !== a.totalMoney) return b.totalMoney - a.totalMoney;

      // Priority 2: Reliability (Effective Attendance)
      if (b.effectiveAttendanceScore !== a.effectiveAttendanceScore) return b.effectiveAttendanceScore - a.effectiveAttendanceScore;

      // Priority 3: Vote Count
      return b.voteScore - a.voteScore;
    });

  // Calculate Rank (handle ties)
  let currentRank = 1;
  const rankedUsers = userStats.map((u,index) => {
    if (index > 0) {
      const prev = userStats[index - 1];
      // If scores are different, update rank to current position (index + 1)
      if (u.totalMoney !== prev.totalMoney || u.effectiveAttendanceScore !== prev.effectiveAttendanceScore || u.voteScore !== prev.voteScore) {
        currentRank = index + 1;
      }
    }
    return { ...u,rank: currentRank };
  });

  const top3 = rankedUsers.slice(0,3);
  const others = rankedUsers.slice(3);

  if (loading) return <div className="text-center py-20">Đang tính điểm...</div>;

  return (
    <div className="flex flex-col gap-8 pb-20">
      <UserDetailModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        allPolls={polls}
        currentUserRole={user?.role}
        onToggleAttendance={handleToggleAttendance}
        onToggleFlake={handleToggleFlake}
        onToggleNonDrinker={handleToggleNonDrinker}
      />

      <div className="text-center py-8">
        <Crown size={64} className="text-primary mx-auto mb-4 animate-bounce" />
        <h1 className="text-4xl font-black text-white mb-2">BXH Đại Gia Chân Đất</h1>
        <p className="text-secondary">Vinh danh các nhà tài trợ vàng cho quán nhậu</p>
      </div>

      {/* Top 3 Cards - Podium Style: 3-2-1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-8 max-w-5xl mx-auto w-full">
        {top3.map((u,idx) => {
          // Determine order: Rank 1 (center), Rank 2 (left), Rank 3 (right)
          let orderClass = '';
          if (u.rank === 1) orderClass = 'md:order-2'; // Center
          else if (u.rank === 2) orderClass = 'md:order-1'; // Left
          else if (u.rank === 3) orderClass = 'md:order-3'; // Right

          return (
            <div key={u.id}
              className={`bg-surface border border-border rounded-2xl p-6 flex flex-col items-center relative cursor-pointer hover:-translate-y-2 transition-transform ${u.rank === 1 ? 'h-96 border-primary shadow-[0_0_30px_rgba(244,140,37,0.5)]' : 'h-90'} ${orderClass}`}
              onClick={() => setSelectedUser(u)}
            >
              <div className="absolute -top-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black border-4 border-surface shadow-lg ${u.rank === 1 ? 'bg-yellow-400 text-black text-xl' : u.rank === 2 ? 'bg-gray-300 text-black' : 'bg-orange-700 text-white'}`}>
                  {u.rank}
                </div>
              </div>
              <img src={u.avatar} className="w-24 h-24 rounded-full border-4 border-background mb-4 mt-6 object-cover" />

              {/* SWAPPED: Real Name is bigger, Nickname is smaller */}
              <h3 className="text-xl font-black text-white text-center uppercase">{u.name}</h3>
              <p className="text-primary font-bold text-sm mb-1 text-center">{u.nickname}</p>
              <p className="text-secondary text-xs mb-2 text-center line-clamp-1 italic">"{u.quote}"</p>

              <div className="mt-auto flex flex-col items-center gap-4 w-full">
                <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30 w-full justify-center">
                  <DollarSign size={20} />
                  <span className="font-black text-lg">{Math.round(u.totalMoney).toLocaleString('vi-VN')}đ</span>
                </div>

                {/* Stats Section - Fixed Layout */}
                <div className="flex justify-around items-center w-full text-sm font-bold text-white/80 px-2 py-2 border-t border-border/50 gap-2">
                  <div className="flex flex-col items-center flex-1 min-w-0" title="Số lần tham gia">
                    <Beer size={18} className="text-secondary mb-1 flex-shrink-0" />
                    <span className="text-center">{u.attendance}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 min-w-0" title="Số lần bùng kèo">
                    <AlertTriangle size={18} className="text-red-400 mb-1 flex-shrink-0" />
                    <span className="text-red-400 text-center">{u.flakeCount}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 min-w-0" title="Số lần vote">
                    <CheckCircle size={18} className="text-blue-400 mb-1 flex-shrink-0" />
                    <span className="text-center">{u.voteScore}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* List of others */}
      <div className="bg-surface rounded-3xl border border-border overflow-hidden max-w-4xl mx-auto w-full">
        <table className="w-full text-left text-sm text-secondary">
          <thead className="bg-background text-xs uppercase font-bold text-white">
            <tr>
              <th className="px-6 py-4 w-16 text-center">#</th>
              <th className="px-6 py-4">Dân chơi</th>
              <th className="px-6 py-4 text-center">Đã chi (VND)</th>
              <th className="px-6 py-4 text-center">Tham gia</th>
              <th className="px-6 py-4 text-center text-red-400">Số lần bùng</th>
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
                      {/* SWAPPED: Real Name is BOLD, Nickname is small */}
                      <div className="font-bold text-white uppercase">{u.name}</div>
                      <div className="text-xs text-primary font-bold">{u.nickname}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">{Math.round(u.totalMoney).toLocaleString('vi-VN')}đ</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-secondary flex items-center justify-center gap-1">
                    {u.attendance} <Beer size={14} className="mb-0.5" />
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {(u.flakeCount || 0) > 0 ? (
                    <span className="text-red-400 font-bold bg-red-900/10 px-2 py-1 rounded">{u.flakeCount}</span>
                  ) : (
                    <span className="text-secondary opacity-30">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center text-xs text-secondary italic mt-4 max-w-lg mx-auto bg-surface/50 p-3 rounded-lg border border-border">
        * Logic xếp hạng: Tổng tiền đã chi (Ưu tiên 1) <br />
        → Điểm chuyên cần (Tham gia - 0.5 x lần bùng kèo) (Ưu tiên 2) <br />
        → Số lần Vote đầy đủ (Ưu tiên 3)
      </div>
    </div>
  );
};

export default Leaderboard;