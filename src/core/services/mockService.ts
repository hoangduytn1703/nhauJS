import { User, Poll, UserRole, PollOption, ParticipantData, BillInfo } from '@/core/types/types';
import { auth, db } from './firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile,
  sendPasswordResetEmail,
  updatePassword,
  sendEmailVerification
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

// Platform detection
const isDU2 = () => {
    const path = window.location.pathname;
    return path === '/du2' || path.startsWith('/du2/');
};
const isOnlyBill = () => {
    const path = window.location.pathname;
    return path.startsWith('/only-bill'); 
};

const getColl = (name: string) => {
  const isOB = isOnlyBill();
  const isD2 = isDU2();
  
  let prefix = "";
  if (isOB) prefix = "ob_";
  else if (isD2) prefix = "du2_";
  
  const finalColl = `${prefix}${name}`;
  // console.log(`[Firestore] Accessing collection: ${finalColl} (Path: ${window.location.pathname})`);
  return finalColl;
};

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const auUser = userCredential.user;
      const uid = auUser.uid;

      // Fetch user data from Firestore first to check for legacy verification
      const userDoc = await getDoc(doc(db, getColl("users"), uid));
      const userDataFromDb = userDoc.exists() ? userDoc.data() as User : null;

      // Logic: Allow login if verified in Auth OR verified in Firestore OR it's the special System Admin
      const isSystemAdmin = email === 'admin@admin.com';
      const isVerified = auUser.emailVerified || userDataFromDb?.isEmailVerified === true || isSystemAdmin;

      if (!isVerified) {
        await signOut(auth);
        throw new Error("Email của bạn chưa được xác minh. Vui lòng kiểm tra hộp thư đến!");
      }

      if (userDataFromDb) {
        if (userDataFromDb.isBanned) {
            await signOut(auth);
            throw new Error("Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm quy chế 'Nhậu nhẹt'. Liên hệ Admin.");
        }
        // Sync verification status to Firestore if Auth is verified but Firestore isn't
        if (auUser.emailVerified && !userDataFromDb.isEmailVerified) {
            await updateDoc(doc(db, getColl("users"), uid), { isEmailVerified: true });
            userDataFromDb.isEmailVerified = true;
        }
        return userDataFromDb;
      } else {
        // Fallback: Nếu login được auth nhưng chưa có trong firestore
        const newUser: User = {
            id: uid,
            email: auUser.email || "",
            name: auUser.displayName || (isSystemAdmin ? (isOnlyBill() ? "Admin Only Bill" : "Sếp Tổng") : "User"),
            nickname: auUser.displayName || (isSystemAdmin ? (isOnlyBill() ? "Admin OB" : "Admin") : "User"),
            avatar: isSystemAdmin ? "https://api.dicebear.com/7.x/bottts/svg?seed=admin" : `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
            role: isSystemAdmin ? UserRole.ADMIN : UserRole.MEMBER,
            quote: isSystemAdmin ? "Only Bill - Privacy & Precision" : 'Chưa say chưa về',
            favoriteDrinks: [],
            isBanned: false,
            isEmailVerified: true,
            flakeCount: 0,
            flakedPolls: [],
            attendanceOffset: 0,
            voteOffset: 0
        };
        await setDoc(doc(db, getColl("users"), uid), newUser);
        return newUser;
      }
    } catch (error: any) {
      console.error("Login Error", error);
      if (error.message.includes("chưa được xác minh")) throw error;
      if (error.message.includes("bị khóa")) throw error;
      throw new Error("Email hoặc mật khẩu không đúng!");
    }
  },

  register: async (email: string, name: string, password: string): Promise<User> => {
    try {
      // Check if registration is enabled
      const settings = await SettingsService.getSettings();
      if (!settings.registrationEnabled) {
          throw new Error("Hiện tại hệ thống đang tạm đóng cổng đăng ký thành viên mới.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Send verification email
      await sendEmailVerification(userCredential.user);

      const newUser: User = {
        id: uid,
        email,
        name,
        nickname: name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        role: UserRole.MEMBER,
        quote: 'Chưa say chưa về',
        favoriteDrinks: [],
        isBanned: false,
        isEmailVerified: false,
        flakeCount: 0,
        flakedPolls: [],
        attendanceOffset: 0,
        voteOffset: 0
      };

      await setDoc(doc(db, getColl("users"), uid), newUser);
      
      // Since registration automatically logs in in Firebase, we should sign out
      // so they have to verify and log in again.
      await signOut(auth);

      return newUser;
    } catch (error: any) {
      console.error("Register Error", error);
      if (error.code === 'auth/email-already-in-use') {
         throw new Error("Email này đã được đăng ký rồi!");
      }
      throw new Error(error.message || "Đăng ký thất bại");
    }
  },

  resetPassword: async (email: string): Promise<void> => {
      try {
          await sendPasswordResetEmail(auth, email);
      } catch (error: any) {
          throw new Error("Không thể gửi email reset. Kiểm tra lại email!");
      }
  },

  changePassword: async (newPassword: string): Promise<void> => {
      if (!auth.currentUser) throw new Error("Chưa đăng nhập");
      try {
          await updatePassword(auth.currentUser, newPassword);
      } catch (error: any) {
          if (error.code === 'auth/requires-recent-login') {
              throw new Error("Bạn cần đăng nhập lại trước khi đổi mật khẩu để bảo mật.");
          }
          throw new Error("Đổi mật khẩu thất bại. Mật khẩu quá yếu hoặc lỗi hệ thống.");
      }
  },

  logout: async (): Promise<void> => {
      await signOut(auth);
  },

  // TEMPORARY: Create DU2 Admin manually
  createDU2Admin: async (email: string, password: string): Promise<User> => {
    try {
      console.log("[Admin Creation] Creating DU2 admin account...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const newUser: User = {
        id: uid,
        email,
        name: "DU2 Admin",
        nickname: "Admin",
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        role: UserRole.ADMIN,
        quote: 'DU2 System Administrator',
        favoriteDrinks: [],
        isBanned: false,
        isEmailVerified: true,
        flakeCount: 0,
        flakedPolls: [],
        attendanceOffset: 0,
        voteOffset: 0
      };

      await setDoc(doc(db, "du2_users", uid), newUser);
      await signOut(auth); // Sign out after creation
      console.log("[Admin Creation] DU2 admin created successfully!");
      return newUser;
    } catch (error: any) {
      console.error("[Admin Creation] Failed:", error);
      if (error.code === 'auth/email-already-in-use') {
         throw new Error("Email đã được sử dụng!");
      }
      throw new Error(error.message || "Tạo admin thất bại");
    }
  }
};

export const SettingsService = {
  getSettings: async (): Promise<{ registrationEnabled: boolean }> => {
    try {
      console.log("[SettingsService] Fetching registration settings...");
      const docSnap = await getDoc(doc(db, "settings", "registration"));
      console.log("[SettingsService] Document exists:", docSnap.exists());
      if (docSnap.exists()) {
        const data = docSnap.data() as { registrationEnabled: boolean };
        console.log("[SettingsService] Document data:", data);
        return data;
      } else {
        console.warn("[SettingsService] Document does not exist, returning default TRUE");
      }
    } catch (e) {
      console.error("[SettingsService] Failed to fetch registration settings (Check Firebase Rules):", e);
    }
    return { registrationEnabled: true }; // Default
  },
  updateSettings: async (data: { registrationEnabled: boolean }): Promise<void> => {
    console.log("[SettingsService] Updating settings to:", data);
    try {
      await setDoc(doc(db, "settings", "registration"), data, { merge: true });
      console.log("[SettingsService] Settings updated successfully");
    } catch (e) {
      console.error("[SettingsService] Failed to update settings:", e);
      throw e;
    }
  }
};

export const DataService = {
  // Save mapping between payment code and user/poll for fast lookup by webhook
  savePaymentMapping: async (paymentCode: string, data: { pollId: string, userId: string, prefix: string }): Promise<void> => {
    await setDoc(doc(db, "payment_mappings", paymentCode), data);
  },

  // Mark a user's bill as paid
  markAsPaidBySepay: async (pollId: string, userId: string, paidAmount: number, collPrefix: string = ""): Promise<void> => {
    const pollRef = doc(db, `${collPrefix}polls`, pollId);
    await updateDoc(pollRef, {
      [`bill.items.${userId}.isPaid`]: true,
      [`bill.items.${userId}.paidAmount`]: paidAmount,
      [`bill.items.${userId}.paidAt`]: Date.now(),
    });
  },

  getUser: async (userId: string): Promise<User | null> => {
    const snap = await getDoc(doc(db, getColl("users"), userId));
    return snap.exists() ? snap.data() as User : null;
  },

  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    const userRef = doc(db, getColl("users"), userId);
    await updateDoc(userRef, data);
    const snapshot = await getDoc(userRef);
    return snapshot.data() as User;
  },

  // Admin: Ban/Unban User
  toggleBanUser: async (userId: string, isBanned: boolean): Promise<void> => {
      const userRef = doc(db, getColl("users"), userId);
      await updateDoc(userRef, { isBanned });
  },

  // Admin: Permanently Delete User
  deleteUser: async (userId: string): Promise<void> => {
      await deleteDoc(doc(db, getColl("users"), userId));
  },

  getPolls: async (): Promise<Poll[]> => {
    const pollsRef = collection(db, getColl("polls"));
    const q = query(pollsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Poll))
      .filter(p => !p.isDeleted);
  },

  createPoll: async (pollData: Omit<Poll, 'id' | 'createdAt' | 'options' | 'timeOptions'>, options: {text: string, description: string, notes?: string, image?: string}[], timeOptions: string[]): Promise<Poll> => {
     const newPollData = {
       ...pollData,
       createdAt: Date.now(),
       participants: {},
       confirmedAttendances: [],
       finalizedOptionId: null,
       finalizedTimeId: null,
       allowMemberAddPlaces: pollData.allowMemberAddPlaces ?? true,
       allowMemberAddTimes: pollData.allowMemberAddTimes ?? true,
       options: options.map((opt, index) => ({
         id: `opt_loc_${Date.now()}_${index}`,
         text: opt.text,
         description: opt.description,
         notes: opt.notes || '',
         votes: [],
         image: opt.image || `https://picsum.photos/400/200?random=${Math.random()}`,
         createdBy: pollData.createdBy
       })),
       timeOptions: timeOptions.map((t, index) => ({
           id: `opt_time_${Date.now()}_${index}`,
           text: t,
           description: '',
           votes: [],
           createdBy: pollData.createdBy
       }))
     };

     const docRef = await addDoc(collection(db, getColl("polls")), newPollData);
     
     return {
       id: docRef.id,
       ...newPollData
     } as Poll;
  },

  updatePoll: async (pollId: string, pollData: Partial<Poll>): Promise<void> => {
    const pollRef = doc(db, getColl("polls"), pollId);
    await updateDoc(pollRef, pollData);
  },

  deletePoll: async (pollId: string): Promise<void> => {
    await deleteDoc(doc(db, getColl("polls"), pollId));
  },

  softDeletePoll: async (pollId: string): Promise<void> => {
    const pollRef = doc(db, getColl("polls"), pollId);
    await updateDoc(pollRef, { isDeleted: true });
  },

  finalizePoll: async (pollId: string, timeId: string | null, optionId: string | null, confirmedAttendances?: string[]): Promise<void> => {
      const pollRef = doc(db, getColl("polls"), pollId);
      const updateData: any = {
          finalizedTimeId: timeId,
          finalizedOptionId: optionId,
      };
      if (confirmedAttendances) {
          updateData.confirmedAttendances = confirmedAttendances;
      }
      await updateDoc(pollRef, updateData);
  },
  
  addPollOption: async (pollId: string, type: 'options' | 'timeOptions', data: { text: string, description?: string, notes?: string, image?: string }, userId: string): Promise<void> => {
      const pollRef = doc(db, getColl("polls"), pollId);
      
       const newOption: PollOption = {
           id: `opt_${type === 'options' ? 'loc' : 'time'}_${Date.now()}_user`,
           text: data.text,
           description: data.description || '',
           notes: data.notes || '',
           votes: [userId], 
           createdBy: userId
       };

       if (type === 'options') {
           newOption.image = data.image || `https://picsum.photos/400/200?random=${Date.now()}`;
       }

      await updateDoc(pollRef, {
          [type]: arrayUnion(newOption)
      });
  },

  updateBill: async (pollId: string, bill: BillInfo): Promise<void> => {
      const pollRef = doc(db, getColl("polls"), pollId);
      await updateDoc(pollRef, { bill });
  },

  saveBankInfo: async (pollId: string, bankInfo: { bankName: string; bankBin: string; accountNumber: string; accountHolder: string; momoNumber?: string }): Promise<void> => {
      const pollRef = doc(db, getColl("polls"), pollId);
      await updateDoc(pollRef, { bankInfo });
  },

  // --- LOGIC BÙNG KÈO & REDEMPTION (Participation) ---
  submitParticipation: async (pollId: string, userId: string, status: 'JOIN' | 'DECLINE', reason?: string): Promise<void> => {
    const pollRef = doc(db, getColl("polls"), pollId);
    const userRef = doc(db, getColl("users"), userId);
    
    await runTransaction(db, async (transaction) => {
        const pollDoc = await transaction.get(pollRef);
        const userDoc = await transaction.get(userRef);
        if (!pollDoc.exists() || !userDoc.exists()) throw "Not found";
        const pollData = pollDoc.data() as Poll;
        const userData = userDoc.data() as User;
        
        const currentParticipant = pollData.participants?.[userId];
        const currentStatus = currentParticipant?.status;

        // 1. Logic: Nếu JOIN -> DECLINE (Bùng kèo)
        if (currentStatus === 'JOIN' && status === 'DECLINE') {
            // Check idempotency: Chỉ tính 1 lần Bùng kèo cho mỗi poll
            const flakedPolls = userData.flakedPolls || [];
            if (!flakedPolls.includes(pollId)) {
                transaction.update(userRef, { 
                    flakeCount: increment(1),
                    flakedPolls: arrayUnion(pollId)
                });
            }
        }
        
        // Note: Nếu DECLINE -> JOIN: Chưa xóa Bùng kèo ngay.
        // Quy tắc: "vote ngày và quán đầy đủ thỉ... xóa đi Bùng kèo".
        // Việc này sẽ được check trong hàm `vote`.

        const participantData: ParticipantData = {
            status,
            reason: reason || '',
            timestamp: Date.now()
        };

        // If switching to DECLINE, clear all existing votes
        let updatedOptions = pollData.options;
        let updatedTimeOptions = pollData.timeOptions || [];

        if (status === 'DECLINE') {
            updatedOptions = updatedOptions.map(opt => ({
                ...opt,
                votes: opt.votes.filter(uid => uid !== userId)
            }));
            
            updatedTimeOptions = updatedTimeOptions.map(opt => ({
                ...opt,
                votes: opt.votes.filter(uid => uid !== userId)
            }));
        }

        transaction.update(pollRef, {
            [`participants.${userId}`]: participantData,
            options: updatedOptions,
            timeOptions: updatedTimeOptions
        });
    });
  },

  // --- LOGIC VOTE & REDEMPTION (Xóa Bùng kèo) ---
  vote: async (pollId: string, optionId: string, userId: string, target: 'options' | 'timeOptions'): Promise<void> => {
    const pollRef = doc(db, getColl("polls"), pollId);
    const userRef = doc(db, getColl("users"), userId);

    await runTransaction(db, async (transaction) => {
      const pollDoc = await transaction.get(pollRef);
      const userDoc = await transaction.get(userRef);
      if (!pollDoc.exists()) throw "Poll does not exist!";
      if (!userDoc.exists()) throw "User does not exist!";

      const pollData = pollDoc.data() as Poll;
      const userData = userDoc.data() as User;
      
      // Check Deadline
      const isDeadlinePassed = pollData.deadline && Date.now() > pollData.deadline;
      if (isDeadlinePassed) {
          throw new Error("Đã hết thời gian bình chọn!");
      }

      // Check participation
      const participant = pollData.participants?.[userId];
      if (!participant || participant.status !== 'JOIN') {
          throw new Error("Bạn phải xác nhận tham gia trước khi vote!");
      }

      // --- 1. Apply Vote Logic ---
      const options = target === 'options' ? pollData.options : (pollData.timeOptions || []);
      let newOptions: PollOption[] = [];

      // Toggle vote
      newOptions = options.map(opt => {
        if (opt.id === optionId) {
            const hasVoted = opt.votes.includes(userId);
            let newVotes = opt.votes;
            if (hasVoted) {
                newVotes = newVotes.filter(uid => uid !== userId);
            } else {
                newVotes = [...newVotes, userId];
            }
            return { ...opt, votes: newVotes };
        }
        return opt;
      });

      // Prepare update payload for Poll
      const updatePayload: any = { [target]: newOptions };
      transaction.update(pollRef, updatePayload);


      // --- 2. Check Redemption (Xóa Bùng kèo) ---
      // Requirement: User previously flaked THIS poll + Now Status JOIN + Voted Full (Time + Loc) + Within Deadline.
      const flakedPolls = userData.flakedPolls || [];
      const hasFlakedThisPoll = flakedPolls.includes(pollId);

      if (hasFlakedThisPoll && !isDeadlinePassed) {
          // Determine existing votes (Current DB state)
          // Note: `newOptions` contains the updated state for the `target` array.
          // We need to check the state of the OTHER array from `pollData`.
          
          let hasVotedLoc = false;
          let hasVotedTime = false;

          if (target === 'options') {
              hasVotedLoc = newOptions.some(o => o.votes.includes(userId)); // Check updated Locs
              hasVotedTime = (pollData.timeOptions || []).some(t => t.votes.includes(userId)); // Check existing Times
          } else {
              hasVotedLoc = pollData.options.some(o => o.votes.includes(userId)); // Check existing Locs
              hasVotedTime = newOptions.some(t => t.votes.includes(userId)); // Check updated Times
          }

          // If Full Vote -> Redemption!
          if (hasVotedLoc && hasVotedTime) {
               transaction.update(userRef, {
                   flakeCount: increment(-1), // Decrease stain
                   flakedPolls: arrayRemove(pollId) // Remove from tracking to prevent double-decrement
               });
          }
      }
    });
  },

  // Toggle Check-in: If checking in, also remove "Flake" penalty if exists
  toggleAttendance: async (pollId: string, userId: string): Promise<void> => {
      const pollRef = doc(db, getColl("polls"), pollId);
      const userRef = doc(db, getColl("users"), userId);

      await runTransaction(db, async (transaction) => {
          const pollDoc = await transaction.get(pollRef);
          const userDoc = await transaction.get(userRef);
          if (!pollDoc.exists()) throw "Poll not found";
          
          const pollData = pollDoc.data() as Poll;
          let attended = pollData.confirmedAttendances || [];
          
          if (attended.includes(userId)) {
              // REMOVE Check-in
              attended = attended.filter(id => id !== userId);
          } else {
              // ADD Check-in
              attended = [...attended, userId];
              
              // IF adding check-in, ensure we remove any existing Flake penalty for this poll
              const userData = userDoc.exists() ? (userDoc.data() as User) : null;
              if (userData) {
                  const flakedPolls = userData.flakedPolls || [];
                  if (flakedPolls.includes(pollId)) {
                      transaction.update(userRef, {
                          flakeCount: increment(-1),
                          flakedPolls: arrayRemove(pollId)
                      });
                  }
              }
          }
          
          transaction.update(pollRef, { confirmedAttendances: attended });
      });
  },

  // NEW: Explicitly toggle Flake Penalty
  toggleFlake: async (pollId: string, userId: string): Promise<void> => {
      const userRef = doc(db, getColl("users"), userId);
      const pollRef = doc(db, getColl("polls"), pollId);

      await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          const pollDoc = await transaction.get(pollRef);

          if (!userDoc.exists() || !pollDoc.exists()) throw "Doc not found";

          const userData = userDoc.data() as User;
          const pollData = pollDoc.data() as Poll;

          const flakedPolls = userData.flakedPolls || [];
          const isFlaked = flakedPolls.includes(pollId);

          if (isFlaked) {
              // REMOVE PENALTY (Forgive)
              transaction.update(userRef, {
                  flakeCount: increment(-1),
                  flakedPolls: arrayRemove(pollId)
              });
          } else {
              // ADD PENALTY (Punish)
              // If penalizing, ensure they are NOT checked-in
              let attended = pollData.confirmedAttendances || [];
              if (attended.includes(userId)) {
                  transaction.update(pollRef, {
                      confirmedAttendances: arrayRemove(userId)
                  });
              }

              transaction.update(userRef, {
                  flakeCount: increment(1),
                  flakedPolls: arrayUnion(pollId)
              });
          }
      });
  },

  toggleNonDrinker: async (pollId: string, userId: string): Promise<void> => {
      const pollRef = doc(db, getColl("polls"), pollId);
      await runTransaction(db, async (transaction) => {
          const pollDoc = await transaction.get(pollRef);
          if (!pollDoc.exists()) throw "Poll not found";
          
          const pollData = pollDoc.data() as Poll;
          const participants = pollData.participants || {};
          if (!participants[userId]) {
              // If user hasn't joined, we can still set the flag for when they do
              participants[userId] = {
                  status: 'JOIN',
                  timestamp: Date.now(),
                  isNonDrinker: true
              };
          } else {
              participants[userId] = {
                  ...participants[userId],
                  isNonDrinker: !participants[userId].isNonDrinker
              };
          }
          
          transaction.update(pollRef, { participants });
      });
  },

  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, getColl("users")));
    return snapshot.docs.map(doc => doc.data() as User);
  },

  toggleTaxiVote: async (pollId: string, userId: string): Promise<void> => {
    const pollRef = doc(db, getColl("polls"), pollId);
    
    await runTransaction(db, async (transaction) => {
        const pollDoc = await transaction.get(pollRef);
        if (!pollDoc.exists()) throw "Poll not found";
        
        const pollData = pollDoc.data() as Poll;
        if (!pollData.enableTaxi) throw "Tính năng taxi không bật";

        // Logic check: Phải vote đủ giờ và quán mới được vote taxi
        // Update: Bỏ require vote quán - chỉ yêu cầu vote thời gian nếu có
        const votedTime = (pollData.timeOptions || []).length > 0 
            ? (pollData.timeOptions || []).some(t => t.votes.includes(userId))
            : true;

        if (!votedTime) {
            throw new Error("Bạn phải bình chọn Thời gian trước khi đăng ký Taxi!");
        }

        const taxiVoters = pollData.taxiVoters || [];
        if (taxiVoters.includes(userId)) {
            transaction.update(pollRef, { taxiVoters: arrayRemove(userId) });
        } else {
            transaction.update(pollRef, { taxiVoters: arrayUnion(userId) });
        }
    });
  },

  // Migration Utility: One-time run to set isEmailVerified for old users
  migrateEmailVerification: async (): Promise<{ updated: number }> => {
    const snapshot = await getDocs(collection(db, getColl("users")));
    let count = 0;
    
    // Using simple loop as Firestore doesn't support bulk update without Admin SDK
    for (const d of snapshot.docs) {
      const data = d.data() as User;
      if (data.isEmailVerified === undefined) {
        await updateDoc(doc(db, getColl("users"), d.id), { isEmailVerified: true });
        count++;
      }
    }
    return { updated: count };
  },

  // Seed DU2 Users
  seedDU2Users: async (): Promise<void> => {
    const rawUsers = [
      { id: "qtui83ofmt8f5qr3simcc9jq7h", email: "anhndb@runsystem.net", nickname: "Nguyen Do Bao Anh", first_name: "Nguyễn", last_name: "Đỗ Bảo Anh" },
      { id: "5t7ic848z7gbznuqajfd5e3ezw", email: "duynh@runsystem.net", nickname: "Nguyen Hoang Duy", first_name: "Nguyễn", last_name: "Hoàng Duy" },
      { id: "w6xek611t3nxxggyphjbuzgdsc", email: "kienht@runsystem.net", nickname: "Huynh Trong Kien", first_name: "Huỳnh", last_name: "Trọng Kiên" },
      { id: "66ouytt34pngxrnkn3ep3sir9o", email: "namnv@runsystem.net", nickname: "Nguyen Van Nam", first_name: "Nguyễn", last_name: "Văn Nam" },
      { id: "s9giuwjd7pyt7bfpt9eynup4my", email: "thanhlc@runsystem.net", nickname: "Le Cong Thanh", first_name: "Lê", last_name: "Công Thành" },
      { id: "nxwbifke77refcopjuy7weimje", email: "tienntm@runsystem.net", nickname: "Nguyen Thi My Tien", first_name: "Nguyễn", last_name: "Thị Mỹ Tiên" },
      { id: "quk6kmhckjdopxbapns9nsh8jc", email: "tinnt1@runsystem.net", nickname: "Nguyễn Trọng Tín", first_name: "Nguyễn", last_name: "Trọng Tín" },
      { id: "psq4f84sktnt5yptw193a56rro", email: "tramvtn@runsystem.net", nickname: "Vu Thi Ngoc Tram", first_name: "Vũ", last_name: "Thị Ngọc Trâm" },
      { id: "gswnbpgb8fdxzj93oo1cxgwuww", email: "chungvh@runsystem.net", nickname: "Vu Huy Chung", first_name: "Vũ", last_name: "Huy Chung" },
      { id: "j1cdx6a8tfnhzq8cofnz915uxh", email: "datntq@runsystem.net", nickname: "Nguyen Tran Quoc Dat", first_name: "Nguyễn", last_name: "Trần Quốc Đạt" },
      { id: "fgw4n98if3frddxmncddfxat5y", email: "duyn@runsystem.net", nickname: "Nguyen Duy", first_name: "Nguyễn", last_name: "Duy" },
      { id: "tkxkt9jey3f1fyxgib7f736igw", email: "duypt@runsystem.net", nickname: "Phan Tuong Duy", first_name: "Phan", last_name: "Tường Duy" },
      { id: "zc1fsoknttbqdy67w86whuurdw", email: "hieulq1@runsystem.net", nickname: "Lê Quang Hiếu", first_name: "Lê", last_name: "Quang Hiếu" },
      { id: "b8q7gkzjxfnb3ek9m6bubaq4zr", email: "hoahk@runsystem.net", nickname: "Huynh Khanh Hoa", first_name: "Huỳnh", last_name: "Khánh Hòa" },
      { id: "p3m4dgyto7yz58a3ryzpgq6k8a", email: "hoanghm@runsystem.net", nickname: "Huynh Minh Hoang", first_name: "Huỳnh", last_name: "Minh Hoàng" },
      { id: "yogjqi85b3ryxkaaizfbdrdqpa", email: "hungdn@runsystem.net", nickname: "Dang Ngoc Hung", first_name: "Đặng", last_name: "Ngọc Hùng" },
      { id: "ii34j91sn381ictns584i5k5we", email: "huynhvt@runsystem.net", nickname: "Vuong Thai Huynh", first_name: "Vương", last_name: "Thái Huỳnh" },
      { id: "yyodifcra3fnpp98nhu1pmstbw", email: "huyph@runsystem.net", nickname: "Pham Hoang Huy", first_name: "Phạm", last_name: "Hoàng Huy" },
      { id: "tib6dmroij84mes6o7kes9nmew", email: "locbm@runsystem.net", nickname: "Bui Minh Loc", first_name: "Bùi", last_name: "Minh Lộc" },
      { id: "aptun7mx3f8t3m3rieikpwspmy", email: "minhnv@runsystem.net", nickname: "Nguyen Van Minh", first_name: "Nguyễn", last_name: "Văn Minh" },
      { id: "xne3umyjk3ge5c1ptpgoz5696r", email: "namvt@runsystem.net", nickname: "Võ Trung Nam", first_name: "Võ", last_name: "Trung Nam" },
      { id: "beb3ca8997y8zr1japy98muu6e", email: "tanlv1@runsystem.net", nickname: "Lê Viết Tân", first_name: "Lê", last_name: "Viết Tân" },
      { id: "9k6u1aowtin4fd5iqorxrnfjiy", email: "tanpt@runsystem.net", nickname: "Pham Thanh Tan", first_name: "Phạm", last_name: "Thanh Tân" },
      { id: "zcpbfr31fpdbigmdwy3my533ue", email: "thaontp@runsystem.net", nickname: "Ngo Thi Phuong Thao", first_name: "Ngô", last_name: "Thị Phương Thảo" },
      { id: "eompefin8pfbmb9gcn4xdahc6h", email: "thaontt@runsystem.net", nickname: "Nguyen Thi Thanh Thao", first_name: "Nguyễn", last_name: "Thị Thanh Thảo" },
      { id: "y7atee4ssfrhfr8qacuots56uh", email: "thucpt@runsystem.net", nickname: "Phạm Tri Thức", first_name: "Phạm", last_name: "Tri Thức" },
      { id: "7e4yowc8aibhbj4b3uc8o6c8ue", email: "tienln@runsystem.net", nickname: "Lâm Ngọc Tiền", first_name: "Lâm", last_name: "Ngọc Tiền" },
      { id: "mr9e441ms3gi9jsi7qib83nxfo", email: "tinnm@runsystem.net", nickname: "Nguyen Minh Tin", first_name: "Nguyễn", last_name: "Minh Tín" },
      { id: "1sm1keom9jrqzqki4wmt6kq8xr", email: "anhvnl@runsystem.net", nickname: "Vo Nguyen Loan Anh", first_name: "Võ", last_name: "Nguyễn Loan Anh" },
      { id: "udr64m3t1brnjb15sxjypnx6qo", email: "annv@runsystem.net", nickname: "Nguyen Van An", first_name: "Nguyễn", last_name: "Văn An" },
      { id: "7imqmtgj5tnxtd5fxywfp4n9xe", email: "gianghvt@runsystem.net", nickname: "Hoang Vu Truong Giang", first_name: "Hoàng", last_name: "Vũ Trường Giang" },
      { id: "933sg8unyjgdmmtogqc4cs8ifo", email: "hiennt1@runsystem.net", nickname: "_Ngo The Hien", first_name: "Ngô", last_name: "Thế Hiển" },
      { id: "rrzm3hy74pdz9xhpap8xrmu6ao", email: "huytq@runsystem.net", nickname: "Trương Quốc Huy", first_name: "Trương", last_name: "Quốc Huy" },
      { id: "h7ftn7bt6prs9c3x1bu37ytyre", email: "lieuht@runsystem.net", nickname: "Hoang Thi Lieu", first_name: "Hoàng", last_name: "Thị Liễu" },
      { id: "cgzwizp4ffbdmkrb534m94y1wc", email: "linhnty@runsystem.net", nickname: "Nguyen Thi Yen Linh", first_name: "Nguyễn", last_name: "Thị Yến Linh" },
      { id: "zotaff9robn6bfmkko7qrf4d1w", email: "locht1@runsystem.net", nickname: "Huynh Tan Loc", first_name: "Huỳnh", last_name: "Tấn Lộc" },
      { id: "xrbjbz96qpfy5p3y16cpmrac7w", email: "minhnc@runsystem.net", nickname: "Nguyen Cao Minh", first_name: "Nguyễn", last_name: "Cao Minh" },
      { id: "7otuhhkukjdy5yik5bz5ikfata", email: "myht@runsystem.net", nickname: "Hoang Thao My", first_name: "Hoàng", last_name: "Thảo My" },
      { id: "kiuft18hgiggid4upyfa1hpchy", email: "mynl@runsystem.net", nickname: "Nguyễn Lệ Mỹ", first_name: "Nguyễn", last_name: "Lệ Mỹ" },
      { id: "hnnne1yt6by9pgn67nf3twen5y", email: "nampvd@runsystem.net", nickname: "Pham Vu Duy Nam", first_name: "Phạm", last_name: "Vũ Duy Nam" },
      { id: "gfoff9qjcigu58ytnsmhbrgdke", email: "nganttt@runsystem.net", nickname: "Tran Thi Thuy Ngan", first_name: "Trần", last_name: "Thị Thùy Ngân" },
      { id: "9gshittbnbymdmb7nmny1ys6ja", email: "sangnt@runsystem.net", nickname: "Nguyen Thai Sang", first_name: "Nguyễn", last_name: "Thái Sang" },
      { id: "rsrogikk5fyy5yw5znix78nhya", email: "tuanpha@runsystem.net", nickname: "🅿. Hà Anh Tuấn", first_name: "Phạm", last_name: "Hà Anh Tuấn" }
    ];

    // Define admin emails
    const adminEmails = ['duynh@runsystem.net', 'anhndb@runsystem.net'];

    for (const raw of rawUsers) {
      const u: User = {
        id: raw.id,
        email: raw.email,
        name: `${raw.first_name} ${raw.last_name}`.trim(),
        nickname: raw.nickname,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${raw.id}`,
        role: adminEmails.includes(raw.email) ? UserRole.ADMIN : UserRole.MEMBER,
        quote: 'We Are One',
        favoriteDrinks: [],
        isBanned: false,
        isEmailVerified: true,
        flakeCount: 0,
        flakedPolls: [],
        attendanceOffset: 0,
        voteOffset: 0
      };
      await setDoc(doc(db, "du2_users", u.id), u);
    }
  },
  seedOnlyBillUsers: async (): Promise<void> => {
    // Get all users from du2_users
    const snap = await getDocs(query(collection(db, "du2_users")));
    const du2Users = snap.docs.map(doc => doc.data() as User);
    
    // Copy each to ob_users
    for (const u of du2Users) {
      await setDoc(doc(db, "ob_users", u.id), u);
    }
  }
};