import React from 'react';
import { Poll, User } from '../types';
import { XCircle, Calendar, MapPin, Users, UserX, CheckCircle, ExternalLink, UserMinus } from 'lucide-react';

interface PollResultModalProps {
    poll: Poll | null;
    users: User[];
    onClose: () => void;
}

export const PollResultModal: React.FC<PollResultModalProps> = ({ poll, users, onClose }) => {
    if (!poll) return null;

    const getWinners = (options: any[]) => {
        if (!options || options.length === 0) return [];
        const maxVotes = Math.max(...options.map(o => o.votes.length));
        if (maxVotes === 0) return [];
        return options.filter(o => o.votes.length === maxVotes);
    };

    // Helper to find user details
    const getUserDetails = (uid: string) => {
        return users.find(u => u.id === uid) || {
            id: uid,
            nickname: 'Unknown',
            avatar: `https://ui-avatars.com/api/?name=Unknown`,
            name: 'Unknown User',
            role: 'MEMBER'
        } as User;
    };

    // --- FILTER LOGIC: EXCLUDE ADMINS ---
    const adminIds = users.filter(u => u.role === 'ADMIN').map(u => u.id);
    const isMember = (uid: string) => !adminIds.includes(uid);

    // Calculate Lists
    const participantIds = Object.keys(poll.participants || {}).filter(isMember);
    
    // 1. JOINED (Registered) - Non-Admin
    const joinedIds = participantIds.filter(id => poll.participants![id].status === 'JOIN');
    
    // 2. CHECKED-IN - Non-Admin
    const attendedIds = (poll.confirmedAttendances || []).filter(isMember);
    
    // 3. FLAKED - Non-Admin
    const flakedIds = joinedIds.filter(id => !attendedIds.includes(id));

    // 4. NOT JOINED (Declined + No Response) - Non-Admin
    const declinedIds = participantIds.filter(id => poll.participants![id].status === 'DECLINE');
    
    // Filter users who are NOT in participantIds (did not interact) AND are NOT admins
    const noResponseIds = users
        .filter(u => !participantIds.includes(u.id) && u.role !== 'ADMIN')
        .map(u => u.id);
    
    // Combine for "Not Going" list
    const notGoingIds = [...declinedIds, ...noResponseIds];

    // Determine Final Results for Display
    const finalTimeText = poll.finalizedTimeId 
        ? new Date(poll.timeOptions?.find(t => t.id === poll.finalizedTimeId)?.text || '').toLocaleDateString('vi-VN')
        : (getWinners(poll.timeOptions || [])[0] ? new Date(getWinners(poll.timeOptions || [])[0].text).toLocaleDateString('vi-VN') : 'Chưa chốt');

    const finalOption = poll.finalizedOptionId
        ? poll.options.find(o => o.id === poll.finalizedOptionId)
        : getWinners(poll.options)[0];
    
    const finalLocText = finalOption?.text || 'Chưa chốt';
    const finalLocUrl = finalOption?.description && (finalOption.description.startsWith('http') || finalOption.description.startsWith('www')) 
        ? finalOption.description 
        : `https://www.google.com/maps/search/${encodeURIComponent(finalOption?.text + ' ' + (finalOption?.description || ''))}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-surface border border-border rounded-3xl w-full max-w-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 text-secondary hover:text-white transition-colors"
                >
                    <XCircle size={32} />
                </button>
                
                <h3 className="text-3xl font-black text-white mb-2 pr-10">{poll.title}</h3>
                <p className="text-secondary text-lg mb-8 border-b border-border pb-6">{poll.description}</p>
                
                <div className="space-y-8">
                    {/* Winners Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-background/50 p-6 rounded-2xl border border-border">
                            <h4 className="text-xs uppercase font-bold text-secondary mb-3 flex items-center gap-2"><Calendar size={16}/> Thời gian chốt</h4>
                            <div className="text-white font-black text-2xl">
                                {finalTimeText}
                            </div>
                        </div>
                        <div className="bg-background/50 p-6 rounded-2xl border border-border">
                            <h4 className="text-xs uppercase font-bold text-secondary mb-3 flex items-center gap-2"><MapPin size={16}/> Địa điểm chốt</h4>
                            <div className="text-white font-black text-2xl line-clamp-2 mb-1">
                                {finalLocText}
                            </div>
                            {finalOption && (
                                <a href={finalLocUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline inline-flex items-center gap-1">
                                    Xem bản đồ <ExternalLink size={12}/>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-xl text-center">
                            <div className="text-blue-400 text-xs font-bold uppercase mb-1">Đăng ký (Join)</div>
                            <div className="text-3xl font-black text-white">{joinedIds.length}</div>
                        </div>
                        <div className="bg-green-900/10 border border-green-500/30 p-4 rounded-xl text-center">
                            <div className="text-green-400 text-xs font-bold uppercase mb-1">Thực tế (Check-in)</div>
                            <div className="text-3xl font-black text-white">{attendedIds.length}</div>
                        </div>
                         <div className="bg-gray-800/50 border border-gray-600/30 p-4 rounded-xl text-center">
                            <div className="text-gray-400 text-xs font-bold uppercase mb-1">Không tham gia</div>
                            <div className="text-3xl font-black text-white">{notGoingIds.length}</div>
                        </div>
                    </div>

                    {/* Check-in List */}
                    <div className="bg-background rounded-2xl border border-border overflow-hidden">
                        <div className="bg-green-600/10 p-4 border-b border-border flex items-center gap-2">
                            <CheckCircle size={20} className="text-green-500"/>
                            <h4 className="text-lg font-bold text-white">Danh sách điểm danh ({attendedIds.length})</h4>
                        </div>
                        <div className="p-6">
                            {attendedIds.length === 0 ? (
                                <p className="text-secondary italic text-center">Chưa có ai check-in</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {attendedIds.map(uid => {
                                        const u = getUserDetails(uid);
                                        return (
                                            <div key={uid} className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-border">
                                                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-secondary/30"/>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white text-sm truncate uppercase">{u.name}</div>
                                                    <div className="text-xs text-primary font-bold truncate">{u.nickname}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Flaked Users (Bùng Kèo) */}
                    {(flakedIds.length > 0) && (
                        <div className="bg-red-900/10 rounded-2xl border border-red-900/30 overflow-hidden">
                             <div className="bg-red-900/20 p-4 border-b border-red-900/30 flex items-center gap-2">
                                <UserX size={20} className="text-red-400"/>
                                <h4 className="text-lg font-bold text-red-100">Danh sách "Bùng Kèo" ({flakedIds.length})</h4>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {flakedIds.map(uid => {
                                        const u = getUserDetails(uid);
                                        return (
                                            <div key={uid} className="flex items-center gap-3 bg-background p-3 rounded-xl border border-red-500/20">
                                                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover grayscale opacity-70"/>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-red-300 text-sm truncate uppercase">{u.name}</div>
                                                    <div className="text-xs text-red-400/60 truncate font-bold">Chưa check-in</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Not Going (Declined + No Response) */}
                    {(notGoingIds.length > 0) && (
                        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 overflow-hidden">
                             <div className="bg-gray-800/50 p-4 border-b border-gray-700/50 flex items-center gap-2">
                                <UserMinus size={20} className="text-gray-400"/>
                                <h4 className="text-lg font-bold text-gray-200">Danh sách không tham gia ({notGoingIds.length})</h4>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {/* Explicitly Declined */}
                                    {declinedIds.map(uid => {
                                        const u = getUserDetails(uid);
                                        return (
                                            <div key={uid} className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-border opacity-75">
                                                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover grayscale"/>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-300 text-sm truncate uppercase">{u.name}</div>
                                                    <div className="text-xs text-orange-400 truncate font-bold">Báo bận</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* No Response */}
                                    {noResponseIds.map(uid => {
                                        const u = getUserDetails(uid);
                                        return (
                                            <div key={uid} className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-border opacity-50">
                                                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover grayscale"/>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-400 text-sm truncate uppercase">{u.name}</div>
                                                    <div className="text-xs text-gray-500 truncate font-bold">Chưa vote</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};