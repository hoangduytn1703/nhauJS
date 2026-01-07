import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/core/hooks';
import { DataService } from '@/core/services/mockService';
import { User, UserRole } from '@/core/types/types';
import { Badge, Edit, Save, Camera, AlertTriangle, Plus } from 'lucide-react';

const DEFAULT_TAGS = [
    'Tiger Bạc (Crystal)', 'Tiger Nâu', 'Heineken', 'Heineken Bạc',
    'Budweiser', 'Bia Sài Gòn', 'Bia 333', 'Sapporo', 'Beck\'s',
    'Bia Trúc Bạch', 'Bia Hơi Hà Nội', 'Strongbow',
    'Rau muống xào tỏi', 'Vịt quay', 'Chả cá mực',
    'Tàu Hũ chiên', 'Cá chiên', 'Tôm nướng'
];

const Profile: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState<Partial<User>>(user || {});
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Tags State
    const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS);
    const [newTag, setNewTag] = useState('');

    if (!user) return null;

    useEffect(() => {
        // Aggregating all tags from all users
        DataService.getUsers().then(users => {
            const allUserTags = new Set<string>(DEFAULT_TAGS);
            users.forEach(u => {
                if (u.favoriteDrinks) {
                    u.favoriteDrinks.forEach(tag => allUserTags.add(tag));
                }
            });
            setAvailableTags(Array.from(allUserTags).sort());
        });
    }, []);

    const handleSave = async () => {
        // 1. Validation Logic
        const nameRegex = /^[\p{L}\s]{3,50}$/u;

        const nickname = formData.nickname?.trim() || '';
        if (!nickname) {
            alert('Vui lòng nhập "Biệt danh trên bàn nhậu"!');
            return;
        }
        if (!nameRegex.test(nickname)) {
            alert('Biệt danh chỉ được chứa chữ cái, độ dài từ 3-50 ký tự.');
            return;
        }

        const realName = formData.name?.trim() || '';
        if (!realName) {
            alert('Vui lòng nhập "Tên thật"!');
            return;
        }
        if (!nameRegex.test(realName)) {
            alert('Tên thật chỉ được chứa chữ cái, độ dài từ 3-50 ký tự.');
            return;
        }

        setSaving(true);
        try {
            const updated = await DataService.updateProfile(user.id, formData);
            updateUser(updated);
            alert('Cập nhật thành công!');
        } catch (e) {
            alert('Lỗi');
        } finally {
            setSaving(false);
        }
    };

    // Logic nén ảnh và chuyển sang Base64
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('Ảnh quá lớn. Vui lòng chọn ảnh < 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                // Resize image via Canvas to avoid large Base64 strings (Firestore document limit is 1MB)
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300;
                const MAX_HEIGHT = 300;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const base64String = canvas.toDataURL('image/jpeg', 0.8); // Compress Quality 0.8
                setFormData({ ...formData, avatar: base64String });
            };
            img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const toggleDrink = (drink: string) => {
        const current = formData.favoriteDrinks || [];
        const newDrinks = current.includes(drink)
            ? current.filter(d => d !== drink)
            : [...current, drink];
        setFormData({ ...formData, favoriteDrinks: newDrinks });
    };

    const handleAddCustomTag = () => {
        const trimmed = newTag.trim();
        if (!trimmed) return;

        // 1. Validation Regex: Vietnamese + Numbers + Spaces only, no special chars
        const validRegex = /^[a-zA-Z0-9\s\u00C0-\u1EF9]+$/;
        if (!validRegex.test(trimmed)) {
            alert("Tên món chỉ được chứa chữ cái tiếng Việt, số và khoảng trắng. Không dùng ký tự đặc biệt.");
            return;
        }

        // 2. Check if it's already in the available list (Just select it)
        if (availableTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            // Case insensitive check, but use the formatted one from list or the new one nicely formatted
            const existing = availableTags.find(t => t.toLowerCase() === trimmed.toLowerCase());
            toggleDrink(existing || trimmed);
            setNewTag('');
            return;
        }

        // 3. Limit Check: Max 3 custom items (items NOT in DEFAULT_TAGS)
        const currentCustoms = (formData.favoriteDrinks || []).filter(d => !DEFAULT_TAGS.includes(d));
        if (currentCustoms.length >= 3) {
            alert("Bạn chỉ được thêm tối đa 3 món mới (ngoài danh sách mặc định).");
            return;
        }

        // 4. Add new
        setAvailableTags(prev => [...prev, trimmed].sort());
        toggleDrink(trimmed);
        setNewTag('');
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-between gap-3 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-secondary mb-2">Hồ Sơ Dân Chơi</h1>
                    <p className="text-secondary">Cập nhật thông tin để anh em nhận diện trên bàn nhậu</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-10">
                {/* Edit Form */}
                <div className="lg:col-span-7 flex flex-col gap-8">
                    {/* Avatar */}
                    <div className="bg-surface/50 border border-border rounded-xl p-6 flex items-center gap-6">
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-24 h-24 rounded-full border-4 border-dashed border-border group-hover:border-primary transition-colors overflow-hidden">
                                <img src={formData.avatar || user.avatar} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-background rounded-full p-2 border-4 border-background hover:scale-110 transition-transform">
                                <Camera size={16} />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Ảnh đại diện</h3>
                            <p className="text-secondary text-sm">Chọn ảnh ngầu nhất đang cầm ly.<br />Click vào ảnh để thay đổi.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-white font-medium flex items-center gap-1">Biệt danh bàn nhậu <span className="text-red-500">*</span></span>
                            <input
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                className={`w-full bg-surface border rounded-xl px-4 h-12 text-white focus:border-primary outline-none ${!formData.nickname?.trim() ? 'border-red-500/50' : 'border-border'}`}
                                placeholder="VD: Tuấn Cồn"
                                required
                            />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-white font-medium flex items-center gap-1">Tên thật <span className="text-red-500">*</span></span>
                            <input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full bg-surface border rounded-xl px-4 h-12 text-white focus:border-primary outline-none ${!formData.name?.trim() ? 'border-red-500/50' : 'border-border'}`}
                                placeholder="Tên đầy đủ"
                                required
                            />
                        </label>
                    </div>

                    <label className="flex flex-col gap-2">
                        <span className="text-white font-medium">Tuyên ngôn khi say</span>
                        <textarea
                            value={formData.quote}
                            onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                            className="w-full bg-surface border border-border rounded-xl p-4 min-h-[100px] text-white focus:border-primary outline-none resize-none"
                        ></textarea>
                    </label>

                    {/* Tags */}
                    <div>
                        <span className="text-white font-medium mb-3 block">Món tủ (Đồ ăn & Uống)</span>

                        {/* Input Custom Tag */}
                        <div className="flex gap-2 mb-4">
                            <input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Thêm món tủ khác (Max 3 món mới/người)..."
                                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                            />
                            <button
                                onClick={handleAddCustomTag}
                                className="bg-surface border border-dashed border-secondary text-secondary hover:text-white hover:border-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-bold"
                            >
                                <Plus size={16} /> Thêm
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableTags.map(drink => (
                                <button
                                    key={drink}
                                    onClick={() => toggleDrink(drink)}
                                    className={`px-4 py-2 rounded-full border transition-all text-sm text-left ${formData.favoriteDrinks?.includes(drink)
                                        ? 'bg-primary text-background font-bold border-primary'
                                        : 'bg-surface text-secondary border-border hover:border-primary'
                                        }`}
                                >
                                    {drink}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-12 bg-primary hover:bg-primary-hover text-background font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Save size={20} /> {saving ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
                    </button>
                </div>

                {/* Preview Card */}
                <div className="lg:col-span-5 relative mt-8 lg:mt-0">
                    <div className="sticky top-24 flex flex-col items-center">
                        <div className="w-full flex justify-between items-center mb-4 max-w-[350px]">
                            <h3 className="text-white font-bold text-lg">Thẻ thành viên</h3>
                            {/* Removed Download Button */}
                        </div>

                        <div
                            className="relative rounded-2xl overflow-hidden shadow-2xl border border-secondary/30 group bg-[#1a120b] shrink-0"
                            style={{ height: '220px', width: '350px' }}
                        >
                            {/* Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#493622] via-[#231a10] to-[#1a120b]"></div>
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white,transparent)]"></div>

                            <div className="relative z-10 flex flex-col h-full p-5 justify-between">
                                {/* Header Badges */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="text-secondary font-bold tracking-widest text-[10px] uppercase border border-secondary px-1.5 py-0.5 rounded">Official Member</span>
                                    </div>
                                    <div className="bg-gradient-to-r from-primary to-orange-400 text-[#231a10] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                        Dân Chơi
                                    </div>
                                </div>

                                {/* Avatar & Info */}
                                <div className="flex gap-4 items-center">
                                    <img
                                        src={formData.avatar || user.avatar}
                                        className="w-16 h-16 rounded-full border-2 border-secondary object-cover shrink-0"
                                    />
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h2 className="text-white text-xl font-black mb-1 truncate leading-tight pb-1">
                                            {formData.nickname || '...'}
                                        </h2>
                                        <div className="flex flex-col">
                                            <p className="text-secondary text-[10px] font-bold uppercase truncate">{formData.name || '...'}</p>
                                            <p className="text-secondary/70 text-[9px] font-mono mt-0.5 truncate">{user.email}</p>
                                        </div>

                                        {(user.flakeCount || 0) > 0 && (
                                            <div className="flex items-center gap-1 mt-1 text-[9px] text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded w-fit border border-red-900/30">
                                                <AlertTriangle size={8} /> {user.flakeCount} lần bùng
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Content */}
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-white/90 text-[10px] italic line-clamp-1 mb-1">"{formData.quote || '...'}"</p>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-1 text-[9px] text-secondary uppercase font-bold max-w-[65%] line-clamp-1">
                                            {formData.favoriteDrinks?.length ? formData.favoriteDrinks.join(' • ') : 'Chưa chọn món tủ'}
                                        </div>
                                        <div className="text-[9px] text-white/50 font-mono">ID: {user.id.toUpperCase().slice(0, 6)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;