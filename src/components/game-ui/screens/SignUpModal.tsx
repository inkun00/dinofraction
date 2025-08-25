import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SignUpModalProps {
  onSignUp: (email: string, pass: string, school: string, nickname: string) => Promise<void>;
  onClose: () => void;
  firebaseErrorKorean: Record<string, string>;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ onSignUp, onClose, firebaseErrorKorean }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [school, setSchool] = React.useState('');
  const [nickname, setNickname] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [messageColor, setMessageColor] = React.useState('red');

  const handleSignUp = async () => {
    if (password.length < 6) {
      setMessage("비밀번호는 6자리 이상이어야 합니다.");
      setMessageColor('red');
      return;
    }
    if (!nickname || !school || !email) {
      setMessage("모든 필드를 입력해주세요.");
      setMessageColor('red');
      return;
    }
    try {
      await onSignUp(email, password, school, nickname);
      setMessage("회원가입 성공! 자동으로 로그인됩니다.");
      setMessageColor('green');
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      const errorCode = error.code;
      setMessage(firebaseErrorKorean[errorCode] || '회원가입 중 오류가 발생했습니다.');
      setMessageColor('red');
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <h2 className="analysis-title">회원가입</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }} className="login-form">
          <Input 
            type="email" 
            id="signup-email"
            name="email"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="login-input" 
            placeholder="이메일" 
            required 
            autoComplete="email"
          />
          <Input 
            type="password" 
            id="signup-password"
            name="password"
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="login-input" 
            placeholder="비밀번호 (6자리 이상)" 
            required 
            autoComplete="new-password"
          />
          <Input 
            type="text" 
            id="signup-school"
            name="school"
            value={school} 
            onChange={e => setSchool(e.target.value)} 
            className="login-input" 
            placeholder="학교 이름" 
            required 
            autoComplete="organization"
          />
          <Input 
            type="text" 
            id="signup-nickname"
            name="nickname"
            value={nickname} 
            onChange={e => setNickname(e.target.value)} 
            className="login-input" 
            placeholder="이름" 
            required 
            autoComplete="name"
          />
          <div style={{ color: messageColor, marginTop: '15px', fontWeight: 'bold', height: '20px' }}>{message}</div>
          <div className="auth-buttons">
            <Button type="submit" className="start-btn">가입하기</Button>
            <Button type="button" onClick={onClose} className="restart-btn close">닫기</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpModal;
