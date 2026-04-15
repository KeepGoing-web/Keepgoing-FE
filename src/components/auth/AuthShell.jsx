import './AuthShell.css'

const AuthShell = ({ children, footer, cardClassName = '' }) => {
  const cardClasses = ['auth-card', cardClassName].filter(Boolean).join(' ')

  return (
    <div className="auth-screen">
      <div className={cardClasses}>
        <div className="auth-intro">
          <h1 className="auth-title">Keepgoing</h1>
        </div>
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export default AuthShell
