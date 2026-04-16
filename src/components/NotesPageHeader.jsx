import './NotesPageHeader.css'

const NotesPageHeader = ({
  kicker,
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <header className={`notes-page-header${className ? ` ${className}` : ''}`}>
      <div className="notes-page-header__copy">
        {kicker ? <p className="notes-page-header__kicker">{kicker}</p> : null}
        <h1 className="notes-page-header__title">{title}</h1>
        {subtitle ? <p className="notes-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="notes-page-header__actions">{actions}</div> : null}
    </header>
  )
}

export default NotesPageHeader
