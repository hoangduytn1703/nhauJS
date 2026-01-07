import { User, Poll, UserRole, PollOption, ParticipantData, BillInfo } from '@/types/types';
import { auth, db } from './firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile,
  sendPasswordResetEmail,
  updatePassword
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

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (userData.isBanned) {
            await signOut(auth);
            throw new Error("Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm quy chế 'Nhậu nhẹt'. Liên hệ Admin.");
        }
        return userData;
      } else {
        // Fallback: Nếu login được auth nhưng chưa có trong firestore
        const newUser: User = {
            id: uid,
            email: userCredential.user.email || "",
            name: userCredential.user.displayName || "User",
            nickname: userCredential.user.displayName || "User",
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
            role: UserRole.MEMBER,
            quote: 'Chưa say chưa về',
            favoriteDrinks: [],
            isBanned: false,
            flakeCount: 0,
            flakedPolls: [],
            attendanceOffset: 0,
            voteOffset: 0
        };
        await setDoc(doc(db, "users", uid), newUser);
        return newUser;
      }
    } catch (error: any) {
      console.error("Login Error", error);
      if (error.message.includes("bị khóa")) throw error;
      throw new Error("Email hoặc mật khẩu không đúng!");
    }
  },

  register: async (email: string, name: string, password: string): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

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
        flakeCount: 0,
        flakedPolls: [],
        attendanceOffset: 0,
        voteOffset: 0
      };

      await setDoc(doc(db, "users", uid), newUser);
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
  }
};

export const DataService = {
  getUser: async (userId: string): Promise<User | null> => {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? snap.data() as User : null;
  },

  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, data);
    const snapshot = await getDoc(userRef);
    return snapshot.data() as User;
  },

  // Admin: Ban/Unban User
  toggleBanUser: async (userId: string, isBanned: boolean): Promise<void> => {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { isBanned });
  },

  // Admin: Permanently Delete User
  deleteUser: async (userId: string): Promise<void> => {
      await deleteDoc(doc(db, "users", userId));
  },

  getPolls: async (): Promise<Poll[]> => {
    const pollsRef = collection(db, "polls");
    const q = query(pollsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Poll));
  },

  createPoll: async (pollData: Omit<Poll, 'id' | 'createdAt' | 'options' | 'timeOptions'>, options: {text: string, description: string, notes?: string, image?: string}[], timeOptions: string[]): Promise<Poll> => {
     const newPollData = {
       ...pollData,
       createdAt: Date.now(),
       participants: {},
       confirmedAttendances: [],
       finalizedOptionId: null,
       finalizedTimeId: null,
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

     const docRef = await addDoc(collection(db, "polls"), newPollData);
     
     return {
       id: docRef.id,
       ...newPollData
     } as Poll;
  },

  updatePoll: async (pollId: string, pollData: Partial<Poll>): Promise<void> => {
    const pollRef = doc(db, "polls", pollId);
    await updateDoc(pollRef, pollData);
  },

  deletePoll: async (pollId: string): Promise<void> => {
    await deleteDoc(doc(db, "polls", pollId));
  },

  finalizePoll: async (pollId: string, timeId: string | null, optionId: string | null): Promise<void> => {
      const pollRef = doc(db, "polls", pollId);
      await updateDoc(pollRef, {
          finalizedTimeId: timeId,
          finalizedOptionId: optionId
      });
  },
  
  addPollOption: async (pollId: string, type: 'options' | 'timeOptions', data: { text: string, description?: string, notes?: string, image?: string }, userId: string): Promise<void> => {
      const pollRef = doc(db, "polls", pollId);
      
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
      const pollRef = doc(db, "polls", pollId);
      await updateDoc(pollRef, { bill });
  },

  // --- LOGIC BÙNG KÈO & REDEMPTION (Participation) ---
  submitParticipation: async (pollId: string, userId: string, status: 'JOIN' | 'DECLINE', reason?: string): Promise<void> => {
    const pollRef = doc(db, "polls", pollId);
    const userRef = doc(db, "users", userId);
    
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
    const pollRef = doc(db, "polls", pollId);
    const userRef = doc(db, "users", userId);

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
      const pollRef = doc(db, "polls", pollId);
      const userRef = doc(db, "users", userId);

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
      const userRef = doc(db, "users", userId);
      const pollRef = doc(db, "polls", pollId);

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

  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(doc => doc.data() as User);
  }
};