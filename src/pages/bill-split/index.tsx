import React, { useState, useEffect, useRef } from 'react';
import { DataService } from '@/core/services/mockService';
import { Poll, User, BillItem, UserRole } from '@/core/types/types';
import { useAuth } from '@/core/hooks';
import { Camera, Save, ArrowLeft, Receipt, DollarSign, Calculator, Lock, Info, Copy, Car } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

// --- Internal Component for Formatted Money Input ---
const MoneyInput: React.FC<{
    value: number;
    onChange: (val: number) => void;
    disabled?: boolean;
    placeholder?: string;
}> = ({ value, onChange, disabled, placeholder }) => {
    // Format on render: 12000 -> "12,000"
    const displayValue = value === 0 ? '' : value.toLocaleString('en-US');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove commas to get raw number
        const raw = e.target.value.replace(/,/g, '');
        // Allow digits only
        if (!/^\d*$/.test(raw)) return;

        onChange(Number(raw));
    };

    return (
        <div className="relative w-full group">
            <input
                type="text"
                disabled={disabled}
                className={`w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 pr-8 text-right text-white font-bold font-mono text-lg outline-none transition-all placeholder-white/20
                    ${!disabled ? 'focus:border-primary focus:bg-black/40 hover:border-white/30' : 'opacity-50 cursor-not-allowed'}
                `}
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder || "0"}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs ${value > 0 ? 'text-primary' : 'text-secondary'}`}>k</span>
        </div>
    );
};

const BillSplit: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [users, setUsers] = useState<Record<string, User>>({});

    // Selection state
    const [selectedPollId, setSelectedPollId] = useState<string>('');
    const selectedPoll = polls.find(p => p.id === selectedPollId);

    // Bill State
    const [billImage, setBillImage] = useState<string>('');
    const [userItems, setUserItems] = useState<Record<string, BillItem>>({});
    const [baseAmount, setBaseAmount] = useState<number>(0);
    const [round2Global, setRound2Global] = useState<number>(0);
    const [totalTaxiAmount, setTotalTaxiAmount] = useState<number>(0);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdmin = user?.role === UserRole.ADMIN;

    useEffect(() => {
        // Only fetch closed/expired polls OR finalized polls
        Promise.all([
            DataService.getPolls(),
            DataService.getUsers()
        ]).then(([allPolls, allUsers]) => {
            const finishedPolls = allPolls.filter(p => (p.deadline > 0 && Date.now() > p.deadline) || !!p.finalizedOptionId || !!p.finalizedTimeId);
            setPolls(finishedPolls);

            const userMap: Record<string, User> = {};
            allUsers.forEach(u => userMap[u.id] = u);
            setUsers(userMap);
        });
    }, []);

    // When poll is selected, load existing bill or init new one
    useEffect(() => {
        if (selectedPoll) {
            if (selectedPoll.bill) {
                setBillImage(selectedPoll.bill.imageUrl || '');
                setUserItems(selectedPoll.bill.items || {});
            } else {
                setBillImage('');
                // Init confirmed users
                const initialItems: Record<string, BillItem> = {};
                (selectedPoll.confirmedAttendances || []).forEach(uid => {
                    initialItems[uid] = {
                        userId: uid,
                        amount: 0,
                        round2Amount: 0,
                        taxiAmount: 0,
                        isPaid: false
                    };
                });
                setUserItems(initialItems);
            }
        }
    }, [selectedPoll]);

    const handleApplyBaseAmount = () => {
        if (!isAdmin) return;
        const newItems = { ...userItems };
        Object.keys(newItems).forEach(uid => {
            newItems[uid].amount = baseAmount;
        });
        setUserItems(newItems);
    };

    const handleApplyRound2Global = () => {
        if (!isAdmin) return;
        const newItems = { ...userItems };
        Object.keys(newItems).forEach(uid => {
            newItems[uid].round2Amount = round2Global;
        });
        setUserItems(newItems);
    }

    const handleApplyTaxiSplit = () => {
        if (!isAdmin || !selectedPoll) return;
        
        // Chỉ những người có đăng ký taxi VÀ được check-in mới bị tính tiền
        const confirmedVoters = (selectedPoll.taxiVoters || []).filter(uid => 
            (selectedPoll.confirmedAttendances || []).includes(uid)
        );

        if (confirmedVoters.length === 0) {
            alert("Không có ai đăng ký đi taxi mà có mặt tại quán!");
            return;
        }

        const perPerson = Math.round(totalTaxiAmount / confirmedVoters.length);
        const newItems = { ...userItems };
        
        // Reset all taxi amounts first
        Object.keys(newItems).forEach(uid => {
            newItems[uid].taxiAmount = 0;
        });

        // Apply new per-person amount to confirmed voters
        confirmedVoters.forEach(uid => {
            if (newItems[uid]) {
                newItems[uid].taxiAmount = perPerson;
            }
        });
        
        setUserItems(newItems);
        alert(`Đã chia ${totalTaxiAmount}k cho ${confirmedVoters.length} người có mặt (~${perPerson}k/người)`);
    };

    const handleItemChange = (uid: string, field: keyof BillItem, value: any) => {
        if (!isAdmin) return;
        setUserItems(prev => ({
            ...prev,
            [uid]: {
                ...prev[uid],
                [field]: value
            }
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isAdmin) return;
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { return alert('Ảnh < 5MB'); }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Bill needs detail
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                setBillImage(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!selectedPollId || !isAdmin) return;
        setSaving(true);
        try {
            const total = (Object.values(userItems) as BillItem[]).reduce((sum, item) => sum + Number(item.amount) + Number(item.round2Amount) + Number(item.taxiAmount || 0), 0);
            await DataService.updateBill(selectedPollId, {
                imageUrl: billImage,
                items: userItems,
                totalAmount: total
            });
            alert('Lưu bill thành công!');
        } catch (e) {
            alert('Lỗi khi lưu');
        } finally {
            setSaving(false);
        }
    };

    // Calculate Total for display
    const grandTotal = (Object.values(userItems) as BillItem[]).reduce((sum, item) => sum + Number(item.amount) + Number(item.round2Amount) + Number(item.taxiAmount || 0), 0);

    // Calculate User's specific amount for QR code
    const currentUserItem = user && userItems[user.id];
    const userTotalAmount = currentUserItem ? (currentUserItem.amount + currentUserItem.round2Amount + (currentUserItem.taxiAmount || 0)) * 1000 : 0;

    // VietQR URL
    const bankBin = "970441"; // VIB
    const bankAccount = "006563589";
    const qrDesc = `${user?.nickname} ck`;
    const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${userTotalAmount}&addInfo=${encodeURIComponent(qrDesc)}`;

    // Helper for deleted users
    const getDisplayUser = (uid: string) => {
        const u = users[uid];
        if (u) return u;
        return {
            id: uid,
            nickname: 'Người dùng đã xóa',
            avatar: `https://ui-avatars.com/api/?name=Deleted&background=000&color=fff`,
        } as User;
    };

    return (
        <div className="pb-20">
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-2">
                        <Receipt className="text-primary" /> Tính Tiền & Chia Bill
                    </h1>
                    <p className="text-secondary">Công khai, minh bạch, tình cảm bền lâu</p>
                </div>
                <Link to="/" className="text-secondary hover:text-white flex items-center gap-1 mt-2 md:mt-0">
                    <ArrowLeft size={16} /> Quay lại
                </Link>
            </header>

            {!selectedPollId ? (
                <div className="bg-surface border border-border rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Chọn kèo đã chốt để xem bill:</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {polls.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPollId(p.id)}
                                className="text-left bg-background border border-border p-4 rounded-xl hover:border-primary transition-colors flex justify-between items-center group"
                            >
                                <div>
                                    <div className="font-bold text-white group-hover:text-primary transition-colors">{p.title}</div>
                                    <div className="text-xs text-secondary">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                </div>
                                {p.bill && <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">Đã có bill</span>}
                            </button>
                        ))}
                    </div>
                    {polls.length === 0 && <p className="text-secondary italic">Chưa có kèo nào đã kết thúc.</p>}
                </div>
            ) : (
                <div className="flex flex-col gap-6 animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setSelectedPollId('')} className="text-secondary text-sm hover:underline">← Chọn kèo khác</button>
                        {!isAdmin && (
                            <span className="text-xs text-secondary bg-surface px-3 py-1 rounded-full border border-border flex items-center gap-1">
                                <Lock size={12} /> Chế độ xem (Chỉ Admin được sửa)
                            </span>
                        )}
                    </div>

                    {/* 1. Bill Image & Payment Info */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Camera size={18} /> Ảnh Hóa Đơn</h3>
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div
                                onClick={() => isAdmin && fileInputRef.current?.click()}
                                className={`w-full md:w-64 aspect-[3/4] bg-background border-2 border-dashed border-border rounded-xl flex items-center justify-center overflow-hidden relative ${isAdmin ? 'cursor-pointer hover:border-primary' : 'cursor-default'}`}
                            >
                                {billImage ? (
                                    <img src={billImage} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-center text-secondary">
                                        {isAdmin ? (
                                            <>
                                                <Camera size={32} className="mx-auto mb-2" />
                                                <span>Upload Bill</span>
                                            </>
                                        ) : (
                                            <span>Admin chưa up bill</span>
                                        )}
                                    </div>
                                )}
                                {isAdmin && <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />}
                            </div>

                            <div className="flex-1 w-full">
                                {isAdmin ? (
                                    <>
                                        <p className="text-secondary text-sm mb-4">Upload ảnh bill để anh em tiện đối chiếu nếu cần thắc mắc.</p>
                                        <div className="bg-background p-4 rounded-xl border border-border">
                                            <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Calculator size={16} /> Công cụ chia nhanh</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-secondary block mb-1">Tiền Tăng 1 (Mỗi người)</label>
                                                    <div className="flex gap-2">
                                                        <MoneyInput
                                                            value={baseAmount}
                                                            onChange={setBaseAmount}
                                                            placeholder="0"
                                                        />
                                                        <button onClick={handleApplyBaseAmount} className="bg-primary hover:bg-primary-hover text-background px-4 rounded-lg font-bold text-xs">Apply</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-secondary block mb-1">Tiền Tăng 2 (Mỗi người)</label>
                                                    <div className="flex gap-2">
                                                        <MoneyInput
                                                            value={round2Global}
                                                            onChange={setRound2Global}
                                                            placeholder="0"
                                                        />
                                                        <button onClick={handleApplyRound2Global} className="bg-primary hover:bg-primary-hover text-background px-4 rounded-lg font-bold text-xs">Apply</button>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 mt-2 pt-2 border-t border-white/5">
                                                    <label className="text-xs text-secondary block mb-1 flex items-center gap-1"><Car size={12}/> Tổng tiền Taxi (Sẽ chia đều cho {selectedPoll.taxiVoters?.length || 0} người)</label>
                                                    <div className="flex gap-2">
                                                        <MoneyInput
                                                            value={totalTaxiAmount}
                                                            onChange={setTotalTaxiAmount}
                                                            placeholder="VD: 150"
                                                        />
                                                        <button onClick={handleApplyTaxiSplit} className="bg-primary hover:bg-primary-hover text-background px-8 rounded-lg font-bold text-sm flex items-center gap-2">
                                                            <Calculator size={14}/> Chia Taxi
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col justify-center">
                                        <div className="bg-background p-6 rounded-xl border border-border">
                                            <h4 className="text-xl font-bold text-primary mb-4 text-center">Thông tin thanh toán</h4>

                                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                                {/* QR Block */}
                                                <div className="bg-white p-3 rounded-lg shadow-lg shrink-0 mx-auto md:mx-0">
                                                    <img src={vietQrUrl} className="w-40 h-40 object-contain" alt="VietQR" />
                                                    <div className="text-center text-black text-xs font-bold mt-1">VIB: {bankAccount}</div>
                                                </div>

                                                {/* Text Info */}
                                                <div className="flex-1 space-y-4 w-full">
                                                    <div className="p-3 bg-surface border border-border rounded-lg flex justify-between items-center">
                                                        <div>
                                                            <div className="text-xs text-secondary">Ngân hàng VIB</div>
                                                            <div className="text-white font-bold font-mono text-lg">{bankAccount}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(bankAccount); alert('Copied VIB') }}
                                                            className="p-2 bg-white/5 hover:bg-white/10 rounded"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="p-3 bg-surface border border-border rounded-lg flex justify-between items-center">
                                                        <div>
                                                            <div className="text-xs text-secondary">Momo</div>
                                                            <div className="text-white font-bold font-mono text-lg">0798889162</div>
                                                        </div>
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText("0798889162"); alert('Copied Momo') }}
                                                            className="p-2 bg-white/5 hover:bg-white/10 rounded"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="text-sm text-secondary text-center md:text-left bg-primary/10 p-2 rounded border border-primary/20">
                                                        Nội dung CK: <span className="text-white font-bold select-all">"ghi tên vào nhé"</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. List Users */}
                    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm text-secondary">
                            <thead className="bg-background text-white font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Thành viên</th>
                                    <th className="px-4 py-3 w-32 md:w-48 text-right">Tăng 1 (k)</th>
                                    <th className="px-4 py-3 w-32 md:w-48 text-right">Tăng 2 (k)</th>
                                    <th className="px-4 py-3 w-32 md:w-40 text-right"><span className="flex items-center justify-end gap-1"><Car size={14}/> Taxi</span></th>
                                    <th className="px-4 py-3 text-right">Tổng</th>
                                    <th className="px-4 py-3 text-center">Đã đóng?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(Object.values(userItems) as BillItem[]).map(item => {
                                    const displayUser = getDisplayUser(item.userId);
                                    const isGhost = !users[item.userId];
                                    return (
                                        <tr key={item.userId} className={item.userId === user?.id ? 'bg-primary/5' : ''}>
                                            <td className="px-4 py-3 flex items-center gap-3">
                                                <img src={displayUser.avatar} className={`w-10 h-10 rounded-full border border-surface ${isGhost ? 'grayscale' : ''}`} />
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${item.userId === user?.id ? 'text-primary' : (isGhost ? 'text-secondary line-through' : 'text-white')}`}>
                                                        {displayUser.nickname} {item.userId === user?.id && '(Bạn)'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <MoneyInput
                                                    value={item.amount}
                                                    onChange={val => handleItemChange(item.userId, 'amount', val)}
                                                    disabled={!isAdmin}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <MoneyInput
                                                    value={item.round2Amount}
                                                    onChange={val => handleItemChange(item.userId, 'round2Amount', val)}
                                                    disabled={!isAdmin}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <MoneyInput
                                                    value={item.taxiAmount || 0}
                                                    onChange={val => handleItemChange(item.userId, 'taxiAmount', val)}
                                                    disabled={!isAdmin}
                                                    placeholder={selectedPoll.taxiVoters?.includes(item.userId) ? "Taxi 🚕" : "0"}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-primary text-xl whitespace-nowrap">
                                                {(item.amount + item.round2Amount + (item.taxiAmount || 0)).toLocaleString()} k
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isPaid}
                                                        disabled={!isAdmin}
                                                        onChange={e => handleItemChange(item.userId, 'isPaid', e.target.checked)}
                                                        className={`w-6 h-6 accent-green-500 rounded cursor-pointer ${!isAdmin ? 'cursor-not-allowed opacity-70' : ''}`}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                <tr className="bg-primary/10">
                                    <td className="px-4 py-4 font-black text-white text-right uppercase tracking-wider" colSpan={4}>TỔNG THIỆT HẠI:</td>
                                    <td className="px-4 py-4 font-black text-primary text-right text-xl whitespace-nowrap">{grandTotal.toLocaleString()} k</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {isAdmin && (
                        <div className="flex justify-end sticky bottom-4 z-20">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-primary hover:bg-primary-hover text-background font-bold px-8 py-4 rounded-xl shadow-2xl flex items-center gap-2 transform active:scale-95 transition-all"
                            >
                                <Save size={24} /> {saving ? 'Đang lưu...' : 'Lưu Bill & Cập nhật BXH'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BillSplit;