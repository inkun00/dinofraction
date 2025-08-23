
import type { Fraction, Problem, Answer, ProblemType } from './types';

export const firebaseErrorKorean: Record<string, string> = {
    'auth/user-not-found': '아이디나 비밀번호를 확인해주세요.',
    'auth/wrong-password': '아이디나 비밀번호를 확인해주세요.',
    'auth/invalid-email': '아이디는 이메일 형식을 맞춰주세요.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password': '비밀번호는 6자리 이상이어야 합니다.',
    'default': '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
};

const possibleDenominators = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
const problemTypesByScore = {
    level1: ['진분수+진분수', '진분수-진분수'],
    level2: ['진분수+진분수_합1초과'],
    level3: ['1-진분수', '자연수-진분수'],
    level4: ['대분수-대분수', '대분수-대분수(받아내림)']
};

function createFractionDisplayHTML(whole: number, numerator: number, denominator: number): string {
    if (numerator === 0 && whole === 0) return `<div><span>0</span></div>`;
    if (numerator === 0 && whole > 0) return `<div><span>${whole}</span></div>`;

    let resultHtml = '';
    if (whole > 0) {
        resultHtml += `<span class="fraction-whole">${whole}</span>`;
    }
    if (numerator > 0) {
        resultHtml += `
            <div class="fraction-part">
                <span class="fraction-numerator">${numerator}</span>
                <div class="fraction-line"></div>
                <span class="fraction-denominator">${denominator}</span>
            </div>`;
    }
    return `<div>${resultHtml}</div>`;
}

function constructProblemText(frac1HTML: string, operator: string, frac2HTML: string): string {
    return `<div class="fraction-display">${frac1HTML}</div> <div class="fraction-display">${operator}</div> <div class="fraction-display">${frac2HTML}</div>`;
}

function normalizeFraction(whole: number, numerator: number, denominator: number): Fraction {
    if (numerator < 0) {
        const borrow = Math.ceil(Math.abs(numerator) / denominator);
        whole -= borrow;
        numerator += borrow * denominator;
    }
    if (numerator >= denominator && denominator > 0) {
        whole += Math.floor(numerator / denominator);
        numerator %= denominator;
    }
    return { whole, numerator, denominator };
}

export function generateProblem(score: number, usedProblems: Set<string>): { problem: Problem, answers: Answer[], problemKey: string } | null {
    let problem: Problem | null = null;
    let attempts = 0;
    const maxAttempts = 100;
    let problemKey = '';

    while (!problem && attempts < maxAttempts) {
        attempts++;
        let currentProblemSet: ProblemType[];
        if (score < 50) currentProblemSet = problemTypesByScore.level1;
        else if (score < 100) currentProblemSet = problemTypesByScore.level2;
        else if (score < 150) currentProblemSet = problemTypesByScore.level3;
        else currentProblemSet = problemTypesByScore.level4;
        
        const problemType = currentProblemSet[Math.floor(Math.random() * currentProblemSet.length)];
        let d = possibleDenominators[Math.floor(Math.random() * possibleDenominators.length)];
        let candidateProblem: Problem | null = null;
        let innerAttempts = 0;
        const maxInnerAttempts = 50;

        let n1: number, n2: number, w1: number, w2: number;
        let answerWhole: number, answerNum: number;
        let text: string;

        switch (problemType) {
            case '진분수+진분수':
                if (d < 3) d = possibleDenominators.filter(den => den >= 3)[0];
                do { n1 = Math.floor(Math.random() * (d - 1)) + 1; n2 = Math.floor(Math.random() * (d - 1)) + 1; innerAttempts++; } while (n1 + n2 >= d && innerAttempts < maxInnerAttempts);
                if (innerAttempts >= maxInnerAttempts) continue;
                answerWhole = 0; answerNum = n1 + n2;
                text = constructProblemText(createFractionDisplayHTML(0, n1, d), '+', createFractionDisplayHTML(0, n2, d));
                candidateProblem = { type: problemType, text, answer: { whole: answerWhole, numerator: answerNum, denominator: d } };
                break;
            case '진분수+진분수_합1초과':
                 do { n1 = Math.floor(Math.random() * (d - 1)) + 1; n2 = Math.floor(Math.random() * (d - 1)) + 1; innerAttempts++; } while (n1 + n2 < d && innerAttempts < maxInnerAttempts);
                if (innerAttempts >= maxInnerAttempts) continue;
                answerWhole = 0; answerNum = n1 + n2;
                text = constructProblemText(createFractionDisplayHTML(0, n1, d), '+', createFractionDisplayHTML(0, n2, d));
                candidateProblem = { type: problemType, text, answer: { whole: answerWhole, numerator: answerNum, denominator: d } };
                break;
            case '진분수-진분수':
                do { n1 = Math.floor(Math.random() * (d - 1)) + 1; n2 = Math.floor(Math.random() * (d - 1)) + 1; innerAttempts++; } while (n1 <= n2 && innerAttempts < maxInnerAttempts);
                if (innerAttempts >= maxInnerAttempts) continue;
                answerWhole = 0; answerNum = n1 - n2;
                text = constructProblemText(createFractionDisplayHTML(0, n1, d), '-', createFractionDisplayHTML(0, n2, d));
                candidateProblem = { type: problemType, text, answer: { whole: answerWhole, numerator: answerNum, denominator: d } };
                break;
            case '대분수-대분수':
                w1 = Math.floor(Math.random() * 4) + 2; w2 = Math.floor(Math.random() * (w1 - 1)) + 1;
                do { n1 = Math.floor(Math.random() * (d - 1)) + 1; n2 = Math.floor(Math.random() * (d - 1)) + 1; innerAttempts++; } while (n1 < n2 && innerAttempts < maxInnerAttempts);
                if (innerAttempts >= maxInnerAttempts) continue;
                answerWhole = w1 - w2; answerNum = n1 - n2;
                text = constructProblemText(createFractionDisplayHTML(w1, n1, d), '-', createFractionDisplayHTML(w2, n2, d));
                candidateProblem = { type: problemType, text, answer: { whole: answerWhole, numerator: answerNum, denominator: d } };
                break;
            case '1-진분수':
                n1 = Math.floor(Math.random() * (d - 1)) + 1; answerWhole = 0; answerNum = d - n1;
                text = constructProblemText('<span>1</span>', '-', createFractionDisplayHTML(0, n1, d));
                candidateProblem = { type: problemType, text, answer: { whole: answerWhole, numerator: answerNum, denominator: d } };
                break;
            case '자연수-진분수':
                w1 = Math.floor(Math.random() * 4) + 2; n1 = Math.floor(Math.random() * (d - 1)) + 1;
                answerWhole = w1 - 1; answerNum = d - n1;
                text = constructProblemText(`<span>${w1}</span>`, '-', createFractionDisplayHTML(0, n1, d));
                candidateProblem = { type: problemType, text, answer: { whole: answerWhole, numerator: answerNum, denominator: d } };
                break;
            case '대분수-대분수(받아내림)':
                w1 = Math.floor(Math.random() * 4) + 2; w2 = Math.floor(Math.random() * (w1 - 1)) + 1;
                do { n1 = Math.floor(Math.random() * (d - 1)) + 1; n2 = Math.floor(Math.random() * (d - 1)) + 1; innerAttempts++; } while (n1 >= n2 && innerAttempts < maxInnerAttempts);
                if (innerAttempts >= maxInnerAttempts) continue;
                answerWhole = w1 - 1 - w2; answerNum = (n1 + d) - n2;
                text = constructProblemText(createFractionDisplayHTML(w1, n1, d), '-', createFractionDisplayHTML(w2, n2, d));
                candidateProblem = { type: problemType, text, answer: { whole: answerWhole, numerator: answerNum, denominator: d } };
                break;
        }

        if (candidateProblem) {
            const currentProblemKey = JSON.stringify({ text: candidateProblem.text });
            if (!usedProblems.has(currentProblemKey)) {
                problem = candidateProblem;
                problemKey = currentProblemKey;
            }
        }
    }
    
    if (!problem) return null;

    const correctAnswer = normalizeFraction(problem.answer.whole, problem.answer.numerator, problem.answer.denominator);
    const answers: Answer[] = [{ value: correctAnswer, isCorrect: true }];

    for (let i = 0; i < 2; i++) {
        let wrongAnswer: Fraction;
        let wrongAttempts = 0;
        do {
            const wrongNum = Math.floor(Math.random() * (problem.answer.denominator * 2));
            const wrongWhole = Math.floor(Math.random() * (correctAnswer.whole + 2));
            wrongAnswer = normalizeFraction(wrongWhole, wrongNum, problem.answer.denominator);
            wrongAttempts++;
        } while (answers.some(a => a.value.whole === wrongAnswer.whole && a.value.numerator === wrongAnswer.numerator) && wrongAttempts < 20);
        answers.push({ value: wrongAnswer, isCorrect: false });
    }

    answers.sort(() => Math.random() - 0.5);
    return { problem, answers, problemKey };
}

export function calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 10)) + 1;
}

export function analyzeStats(stats: Record<string, number>): string | null {
    if (!stats || Object.keys(stats).length === 0) return null;

    let resultType = '';
    let bestValue = -1;

    for (const type in stats) {
        if (stats[type] > bestValue) {
            bestValue = stats[type];
            resultType = type;
        }
    }
    return resultType;
}
