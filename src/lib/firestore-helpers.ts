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
            const allUsersSnapshot = await getDocs(collection(db, 'users'));
            const schoolXP: Record<string, number> = {};

            allUsersSnapshot.forEach(doc => {
                const user = doc.data() as UserData;
                if (user.school && user.totalXp) {
                    schoolXP[user.school] = (schoolXP[user.school] || 0) + user.totalXp;
                }
            });

            const sortedSchools = Object.entries(schoolXP)
                .sort(([,a],[,b]) => b - a)
                .slice(0, 10);

            return sortedSchools.map(([school, totalXp]) => ({ school, totalXp }));

        case 'school-personal':
            if (!schoolName) return [];
            q = query(collection(db, 'users'), where("school", "==", schoolName));
            
            const schoolPersonalSnapshot = await getDocs(q);
            let personalData: LeaderboardEntry[] = [];
            schoolPersonalSnapshot.forEach((doc) => {
                const userData = doc.data() as UserData;
                personalData.push({
                    nickname: userData.nickname || 'Unknown',
                    school: userData.school || 'Unknown',
                    score: userData.score,
                    totalXp: userData.totalXp
                })
            });
            
            personalData.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
            
            return personalData.slice(0, 10);
        
        default:
            return [];
    }
}

export async function getAllSchools(): Promise<string[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const schoolSet = new Set<string>();
    usersSnapshot.forEach(doc => {
        const user = doc.data() as UserData;
        if (user.school) {
            schoolSet.add(user.school);
        }
    });
    return Array.from(schoolSet).sort();
}

export async function getUserRank(userId: string): Promise<{ xpRank: number | null; scoreRank: number | null }> {
    const usersRef = collection(db, "users");
    const currentUserDoc = await getDoc(doc(usersRef, userId));
    if (!currentUserDoc.exists()) {
        return { xpRank: null, scoreRank: null };
    }
    const currentUserData = currentUserDoc.data() as UserData;

    // XP Rank
    const xpQuery = query(usersRef, where("totalXp", ">", currentUserData.totalXp || 0));
    const xpSnapshot = await getDocs(xpQuery);
    const xpRank = xpSnapshot.size + 1;
    
    // Score Rank
    const scoreQuery = query(usersRef, where("score", ">", currentUserData.score || 0));
    const scoreSnapshot = await getDocs(scoreQuery);
    const scoreRank = scoreSnapshot.size + 1;

    return { xpRank, scoreRank };
}
