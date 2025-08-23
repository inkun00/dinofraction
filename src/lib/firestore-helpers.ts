import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import type { UserData, LeaderboardEntry, SchoolLeaderboardEntry } from './types';

export async function saveUserData(userId: string, userData: UserData, currentScore: number) {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    
    const dataToSave = {
        score: userData.score,
        totalXp: userData.totalXp,
        level: userData.level,
        correctProblemTypes: userData.correctProblemTypes,
        wrongProblemTypes: userData.wrongProblemTypes,
        school: userData.school || null,
        nickname: userData.nickname || null,
        timestamp: serverTimestamp()
    };

    try {
        await setDoc(userDocRef, dataToSave, { merge: true });

        if (dataToSave.nickname && currentScore > 0) {
            const leaderboardDocRef = doc(collection(db, 'leaderboards'));
            await setDoc(leaderboardDocRef, {
                school: dataToSave.school,
                nickname: dataToSave.nickname,
                score: currentScore,
                timestamp: serverTimestamp(),
                userId: userId
            });
        }
    } catch (e) {
        console.error("Error saving user data: ", e);
    }
}

export async function loadUserData(userId: string): Promise<UserData> {
    const defaultData: UserData = { score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {} };
    if (!userId) return defaultData;

    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        return docSnap.exists() ? { ...defaultData, ...docSnap.data() } as UserData : defaultData;
    } catch (e) {
        console.error("Error loading user data:", e);
        return defaultData;
    }
}

export async function getLeaderboardFromFirestore(type: 'score' | 'xp' | 'school'): Promise<Array<LeaderboardEntry | SchoolLeaderboardEntry>> {
    let q;
    if (type === 'score') {
        q = query(collection(db, 'leaderboards'), orderBy("score", "desc"), limit(10));
    } else if (type === 'xp') {
        q = query(collection(db, 'users'), orderBy("totalXp", "desc"), limit(10));
    } else { // school
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const schoolData: Record<string, number> = {};
        usersSnapshot.forEach(doc => {
            const user = doc.data() as UserData;
            if (user.school && user.totalXp) {
                schoolData[user.school] = (schoolData[user.school] || 0) + user.totalXp;
            }
        });
        const sortedSchools = Object.entries(schoolData).sort(([, a], [, b]) => b - a).slice(0, 10);
        return sortedSchools.map(([school, totalXp]) => ({ school, totalXp }));
    }
    
    const querySnapshot = await getDocs(q);
    let data: LeaderboardEntry[] = [];
    querySnapshot.forEach((doc) => data.push(doc.data() as LeaderboardEntry));
    return data;
}
