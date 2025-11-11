export default function Custom404() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '72px', margin: '0' }}>404</h1>
      <h2 style={{ fontSize: '24px', margin: '20px 0' }}>Page Not Found</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a href="/" style={{
        padding: '10px 20px',
        backgroundColor: '#0070f3',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '5px'
      }}>
        Go back home
      </a>
    </div>
  )
}
