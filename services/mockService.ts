import { User, Poll, UserRole, PollOption, ParticipantData, BillInfo } from '../types';
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
  arrayUnion
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
            isBanned: false
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
        isBanned: false
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
      // We only delete the Firestore document.
      // We CANNOT delete the Auth User easily from client SDK without Admin SDK.
      // But deleting the firestore doc effectively removes them from the app logic.
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

  createPoll: async (pollData: Omit<Poll, 'id' | 'createdAt' | 'options' | 'timeOptions'>, options: {text: string, description: string}[], timeOptions: string[]): Promise<Poll> => {
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
         votes: [],
         image: `https://picsum.photos/400/200?random=${Math.random()}`
       })),
       timeOptions: timeOptions.map((t, index) => ({
           id: `opt_time_${Date.now()}_${index}`,
           text: t,
           description: '',
           votes: [],
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
  
  // User adds new option (Location or Time)
  addPollOption: async (pollId: string, type: 'options' | 'timeOptions', data: { text: string, description?: string }, userId: string): Promise<void> => {
      const pollRef = doc(db, "polls", pollId);
      
      const newOption: PollOption = {
          id: `opt_${type === 'options' ? 'loc' : 'time'}_${Date.now()}_user`,
          text: data.text,
          description: data.description || '',
          votes: [userId], // Auto vote for creator
          image: type === 'options' ? `https://picsum.photos/400/200?random=${Date.now()}` : undefined
      };

      await updateDoc(pollRef, {
          [type]: arrayUnion(newOption)
      });
  },

  // Save bill information
  updateBill: async (pollId: string, bill: BillInfo): Promise<void> => {
      const pollRef = doc(db, "polls", pollId);
      await updateDoc(pollRef, { bill });
  },

  // Logic Join/Decline: Clear votes if decline
  submitParticipation: async (pollId: string, userId: string, status: 'JOIN' | 'DECLINE', reason?: string): Promise<void> => {
    const pollRef = doc(db, "polls", pollId);
    
    await runTransaction(db, async (transaction) => {
        const pollDoc = await transaction.get(pollRef);
        if (!pollDoc.exists()) throw "Poll not found";
        
        const pollData = pollDoc.data() as Poll;
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

  // Unified vote function for Location ('options') or Time ('timeOptions')
  vote: async (pollId: string, optionId: string, userId: string, target: 'options' | 'timeOptions'): Promise<void> => {
    const pollRef = doc(db, "polls", pollId);

    await runTransaction(db, async (transaction) => {
      const pollDoc = await transaction.get(pollRef);
      if (!pollDoc.exists()) {
        throw "Poll does not exist!";
      }

      const pollData = pollDoc.data() as Poll;
      
      // Check Deadline
      if (pollData.deadline && Date.now() > pollData.deadline) {
          throw new Error("Đã hết thời gian bình chọn!");
      }

      // Check participation
      const participant = pollData.participants?.[userId];
      if (!participant || participant.status !== 'JOIN') {
          throw new Error("Bạn phải xác nhận tham gia trước khi vote!");
      }

      const options = target === 'options' ? pollData.options : (pollData.timeOptions || []);
      let newOptions: PollOption[] = [];

      // Logic: Allow multiple votes for both Time and Location (as requested "Time options also multiple")
      // If user clicks again -> toggle off
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

      transaction.update(pollRef, { [target]: newOptions });
    });
  },

  // Admin toggles attendance
  toggleAttendance: async (pollId: string, userId: string): Promise<void> => {
      const pollRef = doc(db, "polls", pollId);
      await runTransaction(db, async (transaction) => {
          const pollDoc = await transaction.get(pollRef);
          if (!pollDoc.exists()) throw "Poll not found";
          
          const pollData = pollDoc.data() as Poll;
          let attended = pollData.confirmedAttendances || [];
          
          if (attended.includes(userId)) {
              attended = attended.filter(id => id !== userId);
          } else {
              attended = [...attended, userId];
          }
          
          transaction.update(pollRef, { confirmedAttendances: attended });
      });
  },

  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(doc => doc.data() as User);
  }
};