import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import type { UserData, LeaderboardEntry, SchoolLeaderboardEntry } from './types';

export async function saveUserData(userId: string, userData: UserData) {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    
    // Firestore는 undefined 값을 저장할 수 없으므로, || [] 를 사용하여 빈 배열로 초기화합니다.
    const dataToSave = {
        ...userData,
        wrongProblems: userData.wrongProblems || [], 
        timestamp: serverTimestamp()
    };

    try {
        // setDoc을 사용하여 문서 전체를 덮어쓰거나 새로 생성합니다.
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
            // wrongProblems 필드가 없거나 null일 경우 빈 배열로 초기화
            return { ...defaultData, ...data, wrongProblems: data.wrongProblems || [] } as UserData;
        }
        return defaultData;
    } catch (e) {
        console.error("Error loading user data:", e);
        return defaultData;
    }
}

export async function getLeaderboardFromFirestore(type: 'score' | 'xp' | 'school', schoolName?: string): Promise<Array<LeaderboardEntry>> {
    let q;
    if (type === 'score') {
        q = query(collection(db, 'users'), orderBy("score", "desc"), limit(10));
    } else if (type === 'xp') {
        q = query(collection(db, 'users'), orderBy("totalXp", "desc"), limit(10));
    } else { // school
        if (!schoolName) return [];
        q = query(collection(db, 'users'), where("school", "==", schoolName));
        
        const querySnapshot = await getDocs(q);
        let data: LeaderboardEntry[] = [];
        querySnapshot.forEach((doc) => {
            const userData = doc.data() as UserData;
            data.push({
                nickname: userData.nickname || 'Unknown',
                school: userData.school || 'Unknown',
                score: userData.score,
                totalXp: userData.totalXp
            })
        });
        
        // 클라이언트 측에서 정렬
        data.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
        
        return data.slice(0, 10);
    }
    
    const querySnapshot = await getDocs(q);
    let data: LeaderboardEntry[] = [];
    querySnapshot.forEach((doc) => {
        const userData = doc.data() as UserData;
        data.push({
            nickname: userData.nickname || 'Unknown',
            school: userData.school || 'Unknown',
            score: userData.score,
            totalXp: userData.totalXp
        })
    });
    return data;
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
