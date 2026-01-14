import React,{ useState,useEffect } from 'react';
import { DataService } from '@/core/services/mockService';
import { Poll,User } from '@/core/types/types';
import { useAuth } from '@/core/hooks';
import { Receipt, Search, Calendar, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
    
// This is a public view page for those with only-bill access
const OnlyBillView: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const { user } = useAuth();
    const [polls,setPolls] = useState<Poll[]>([]);
    const [users,setUsers] = useState<Record<string,User>>({});
    const [loading,setLoading] = useState(true);
    const [searchTerm,setSearchTerm] = useState('');

    useEffect(() => {
        refreshData();
    },[]);

    const refreshData = async () => {
        setLoading(true);
        try {
            const [pData,uData] = await Promise.all([
                DataService.getPolls(),
                DataService.getUsers()
            ]);
            setPolls(pData.filter(p => !!p.bill)); // Only show polls with bills
            
            const userMap: Record<string,User> = {};
            uData.forEach(u => userMap[u.id] = u);
            setUsers(userMap);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-20 max-w-4xl mx-auto">
            <header className="mb-10 text-center">
                <div className="inline-flex p-4 bg-primary/10 rounded-3xl mb-4 border border-primary/20">
                    <Receipt className="text-primary" size={40} />
                </div>
                <h1 className="text-4xl font-black text-white mb-2">Tra Cứu Hóa Đơn</h1>
                <p className="text-secondary max-w-md mx-auto italic">Nơi lưu giữ những kỷ niệm "phê pha" và minh bạch về tài chính.</p>
            </header>

            <div className="relative mb-8 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" size={24} />
                <input 
                    type="text" 
                    placeholder="Tìm tên kèo nhậu..."
                    className="w-full bg-surface border border-border rounded-3xl py-6 pl-16 pr-8 text-white text-lg font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-2xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-secondary font-bold animate-pulse">Đang nạp dữ liệu...</p>
                    </div>
                ) : polls.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <div className="text-center p-20 bg-surface border border-dashed border-border rounded-3xl">
                        <p className="text-secondary italic">Không tìm thấy hóa đơn nào.</p>
                    </div>
                ) : (
                    polls
                      .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
                      .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0))
                      .map(poll => (
                        <Link 
                            key={poll.id}
                            to={`/only-bill/bills?pollId=${poll.id}`}
                            className="flex items-center justify-between p-6 bg-surface border border-border rounded-3xl hover:border-primary hover:bg-primary/5 transition-all group shadow-xl"
                        >
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex w-16 h-16 bg-background rounded-2xl items-center justify-center border border-border group-hover:border-primary/30 transition-all">
                                    <Calendar className="text-secondary group-hover:text-primary" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{poll.title}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-secondary font-mono">{new Date(poll.createdAt || 0).toLocaleDateString('vi-VN')}</span>
                                        <span className="w-1 h-1 rounded-full bg-secondary opacity-30"></span>
                                        <span className="text-xs font-bold text-primary">{(poll.bill?.totalAmount || 0).toLocaleString()} đ</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {(poll.confirmedAttendances || []).slice(0, 5).map(uid => (
                                            <span key={uid} className="text-[10px] bg-white/5 text-secondary px-1.5 py-0.5 rounded border border-border">
                                                {users[uid]?.nickname}
                                            </span>
                                        ))}
                                        {(poll.confirmedAttendances || []).length > 5 && (
                                            <span className="text-[10px] text-secondary opacity-50">
                                                +{(poll.confirmedAttendances || []).length - 5}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="bg-primary/10 text-primary p-3 rounded-2xl group-hover:bg-primary group-hover:text-background transition-all">
                                    <ChevronRight size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Xem Chi Tiết</span>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            <footer className="mt-20 text-center border-t border-border pt-10">
                <p className="cursor-pointer text-secondary hover:text-white inline-flex items-center gap-2 font-bold transition-all">
                    © 2021-{currentYear} Nhậu JS. All Right Reserved.
                </p>
            </footer>
        </div>
    );
};

export default OnlyBillView;
