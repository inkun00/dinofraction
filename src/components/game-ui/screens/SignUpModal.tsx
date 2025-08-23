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
    if (!nickname || !school) {
      setMessage("학교와 이름을 모두 입력해주세요.");
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
        <div className="login-form">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="login-input" placeholder="이메일" required />
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="login-input" placeholder="비밀번호 (6자리 이상)" required />
          <Input type="text" value={school} onChange={e => setSchool(e.target.value)} className="login-input" placeholder="학교 이름" required />
          <Input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="login-input" placeholder="이름" required />
          <div style={{ color: messageColor, marginTop: '15px', fontWeight: 'bold', height: '20px' }}>{message}</div>
          <div className="auth-buttons">
            <Button onClick={handleSignUp} className="start-btn">가입하기</Button>
            <Button onClick={onClose} className="restart-btn close">닫기</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpModal;
