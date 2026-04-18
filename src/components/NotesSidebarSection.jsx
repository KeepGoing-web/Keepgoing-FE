import { useState } from 'react'

const NotesSidebarSection = ({
  title,
  children,
  defaultOpen = true,
  aside,
  className = '',
  contentClassName = '',
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={`sidebar-section${className ? ` ${className}` : ''}`}>
      <button
        className="sidebar-section-header"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="sidebar-section-title-wrap">
          <span>{title}</span>
        </span>
        {aside ? <span className="sidebar-section-aside">{aside}</span> : null}
      </button>
      {open ? <div className={`sidebar-section-content${contentClassName ? ` ${contentClassName}` : ''}`}>{children}</div> : null}
    </section>
  )
}

export default NotesSidebarSection
