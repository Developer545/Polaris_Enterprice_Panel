import { Spin } from 'antd'

export default function AuthLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0a0f2e 0%, #04060f 60%, #000005 100%)',
    }}>
      <Spin size="large" style={{ color: '#93c5fd' }} />
    </div>
  )
}
