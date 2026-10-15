/**
 * 404：此路不通
 */
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Result
        status="404"
        title={<span className="text-[#C9A961]">此路不通</span>}
        subTitle={<span className="text-[#8A94A0]">洞府之中并无此处，道友请回。</span>}
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard', { replace: true })}>
            返回洞府控制室
          </Button>
        }
      />
    </div>
  );
}
