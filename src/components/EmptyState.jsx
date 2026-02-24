import './EmptyState.css'

/**
 * Reusable empty state with icon, title, description, and optional CTA.
 * @param {string} icon — emoji or symbol
 * @param {string} title
 * @param {string} [description]
 * @param {React.ReactNode} [action] — e.g. <Link> or <button>
 */
const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div className="empty-state">
    <span className="empty-state-icon">{icon}</span>
    <h3 className="empty-state-title">{title}</h3>
    {description && <p className="empty-state-desc">{description}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
)

export default EmptyState
