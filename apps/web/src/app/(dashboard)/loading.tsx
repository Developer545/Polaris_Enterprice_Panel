import { Spin } from 'antd'

export default function DashboardLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: 12,
      color: '#787774',
      fontSize: 13,
    }}>
      <Spin size="large" />
      <span>Cargando...</span>
    </div>
  )
}
