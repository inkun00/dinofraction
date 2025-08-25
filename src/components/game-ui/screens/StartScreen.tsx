
import React from 'react';
import type { User } from 'firebase/auth';
import type { UserData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StartScreenProps {
  currentUser: User | null;
  userData: UserData;
  onLogin: (email: string, pass: string) => Promise<void>;
  onShowSignUp: () => void;
  onShowProfile: () => void;
  onShowLeaderboard: () => void;
  firebaseErrorKorean: Record<string, string>;
}

const StartScreen: React.FC<StartScreenProps> = ({ currentUser, userData, onLogin, onShowSignUp, onShowProfile, onShowLeaderboard, firebaseErrorKorean }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [messageColor, setMessageColor] = React.useState('red');

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("이메일과 비밀번호를 모두 입력해주세요.");
      setMessageColor('red');
      return;
    }
    try {
      await onLogin(email, password);
      setMessage("로그인 성공!");
      setMessageColor('green');
    } catch (error: any) {
      const errorCode = error.code;
      setMessage(firebaseErrorKorean[errorCode] || firebaseErrorKorean['default']);
      setMessageColor('red');
    }
  };

  return (
    <div className="start-screen" style={{ display: 'flex' }}>
      <div className="start-content">
        <h1 className="game-title">🦕 분수의 덧셈과 뺄셈 탐험</h1>
        {!currentUser ? (
          <div id="loginFormContainer">
            <div className="login-form">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="login-input" placeholder="이메일" required />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="login-input" placeholder="비밀번호" required />
              <div style={{ color: messageColor, marginTop: '15px', fontWeight: 'bold', height: '20px' }}>{message}</div>
              <div className="auth-buttons">
                <Button onClick={handleLogin} className="restart-btn">로그인</Button>
                <Button onClick={onShowSignUp} className="start-btn">회원가입</Button>
              </div>
            </div>
          </div>
        ) : (
          <div id="postLoginContainer">
            <div className="text-xl my-4">{userData.nickname || '사용자'}님, 환영합니다!</div>
            <div className="analysis-buttons">
              <Button onClick={onShowProfile} className="start-btn">게임 시작</Button>
              <Button onClick={onShowLeaderboard} className="restart-btn bg-yellow-500 hover:bg-yellow-600 border-yellow-700">🏆 리더보드</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StartScreen;
