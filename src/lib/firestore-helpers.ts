import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import type { UserData, LeaderboardEntry, SchoolLeaderboardEntry, LeaderboardType } from './types';

export async function saveUserData(userId: string, userData: UserData) {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    
    const dataToSave = {
        ...userData,
        wrongProblems: userData.wrongProblems || [], 
        timestamp: serverTimestamp()
    };

    try {
        await setDoc(userDocRef, dataToSave, { merge: true });
    } catch (e) {
        console.error("Error saving user data: ", e);
    }
}

export async function loadUserData(userId: string): Promise<UserData> {
    const defaultData: UserData = { score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {}, wrongProblems: [] };
    if (!userId) return defaultData;

    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { ...defaultData, ...data, wrongProblems: data.wrongProblems || [] } as UserData;
        }
        return defaultData;
    } catch (e) {
        console.error("Error loading user data:", e);
        return defaultData;
    }
}

export async function getLeaderboardFromFirestore(type: LeaderboardType, schoolName?: string): Promise<Array<LeaderboardEntry | SchoolLeaderboardEntry>> {
    try {
        let q;
        switch(type) {
            case 'score':
                q = query(collection(db, 'users'), orderBy("score", "desc"), limit(10));
                const scoreSnapshot = await getDocs(q);
                return scoreSnapshot.docs.map(doc => doc.data() as LeaderboardEntry);

            case 'xp':
                q = query(collection(db, 'users'), orderBy("totalXp", "desc"), limit(10));
                const xpSnapshot = await getDocs(q);
                return xpSnapshot.docs.map(doc => doc.data() as LeaderboardEntry);
            
            case 'school-total-xp':
                const allUsersSnapshotForSchool = await getDocs(collection(db, 'users'));
                const schoolXP: Record<string, number> = {};

                allUsersSnapshotForSchool.forEach(doc => {
                    const user = doc.data() as UserData;
                    if (user.school && user.totalXp) {
                        schoolXP[user.school] = (schoolXP[user.school] || 0) + user.totalXp;
                    }
                });

                const sortedSchools = Object.entries(schoolXP)
                    .sort(([,a],[,b]) => b - a)
                    .slice(0, 10);

                return sortedSchools.map(([school, totalXp]) => ({ school, totalXp }));

            case 'school-personal-by-school':
                if (!schoolName) return [];
                q = query(collection(db, 'users'), where("school", "==", schoolName), orderBy("totalXp", "desc"), limit(10));
                const schoolPersonalSnapshot = await getDocs(q);
                return schoolPersonalSnapshot.docs.map(doc => doc.data() as LeaderboardEntry);
            
            default:
                return [];
        }
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        return [];
    }
}

export async function getAllSchools(): Promise<string[]> {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const schoolSet = new Set<string>();
        usersSnapshot.forEach(doc => {
            const user = doc.data() as UserData;
            if (user.school) {
                schoolSet.add(user.school);
            }
        });
        return Array.from(schoolSet).sort();
    } catch(e) {
        console.error("Error getting all schools", e);
        return [];
    }
}

export async function getUserRank(userId: string): Promise<{ xpRank: number | null; scoreRank: number | null }> {
    try {
        if (!userId) return { xpRank: null, scoreRank: null };

        const usersRef = collection(db, "users");
        const allUsersSnapshot = await getDocs(usersRef);
        const allUsers = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as UserData) }));

        if (!allUsers.some(user => user.uid === userId)) {
            return { xpRank: null, scoreRank: null };
        }

        // XP Rank
        const sortedByXp = [...allUsers].sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
        const xpRank = sortedByXp.findIndex(user => user.uid === userId) + 1;

        // Score Rank
        const sortedByScore = [...allUsers].sort((a, b) => (b.score || 0) - (a.score || 0));
        const scoreRank = sortedByScore.findIndex(user => user.uid === userId) + 1;

        return {
            xpRank: xpRank > 0 ? xpRank : null,
            scoreRank: scoreRank > 0 ? scoreRank : null
        };
    } catch (error) {
        console.error("Error fetching user rank:", error);
        return { xpRank: null, scoreRank: null };
    }
}
