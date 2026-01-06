import React, { useEffect, useState } from 'react';
import { DataService } from '../services/mockService';
import { User, Poll } from '../types';
import { Users, Search, Beer, Crown, AlertTriangle } from 'lucide-react';
import { UserDetailModal } from '../components/UserDetailModal';

const Members: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter: Search term AND Exclude Admin
  const filteredUsers = users.filter(u => 
      u.role !== 'ADMIN' &&
      (u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getAttendanceCount = (uid: string) => {
      const real = polls.filter(p => p.confirmedAttendances?.includes(uid)).length;
      const user = users.find(u => u.id === uid);
      return real + (user?.attendanceOffset || 0);
  }

  if (loading) return <div className="text-center py-20 text-secondary">Đang tải danh sách...</div>;

  return (
    <div className="pb-20">
        <UserDetailModal 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
            allPolls={polls}
        />

        <div className="mb-8">
            <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
                <Users className="text-primary" size={32} /> Hội Bàn Tròn
            </h1>
            <p className="text-secondary">Danh sách {filteredUsers.length} chiến thần bất tử trên bàn nhậu.</p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={20} />
            <input 
                type="text"
                placeholder="Tìm tên chiến hữu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl h-12 pl-12 pr-4 text-white focus:border-primary outline-none"
            />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map(user => {
                const attendance = getAttendanceCount(user.id);
                return (
                    <div 
                        key={user.id} 
                        onClick={() => setSelectedUser(user)}
                        className={`bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-all cursor-pointer group ${user.isBanned ? 'opacity-50 grayscale' : ''}`}
                    >
                        <div className="relative shrink-0">
                            <img src={user.avatar} className="w-14 h-14 rounded-full border-2 border-border group-hover:border-primary object-cover transition-colors" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                            <h3 className="text-white font-bold truncate group-hover:text-primary transition-colors">{user.nickname}</h3>
                            <p className="text-xs text-secondary truncate">{user.name}</p>
                            
                            <div className="flex gap-2 mt-2">
                                <span className="bg-background/50 px-2 py-0.5 rounded text-[10px] text-secondary border border-border flex items-center gap-1">
                                    <Beer size={10} /> {attendance}
                                </span>
                                {(user.flakeCount || 0) > 0 && (
                                    <span className="bg-red-900/20 px-2 py-0.5 rounded text-[10px] text-red-400 border border-red-900/30 flex items-center gap-1">
                                        <AlertTriangle size={10} /> {user.flakeCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>

        {filteredUsers.length === 0 && (
            <div className="text-center py-10 text-secondary">
                Không tìm thấy ai tên là "{searchTerm}"
            </div>
        )}
    </div>
  );
};

export default Members;