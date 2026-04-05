const RAGFollowUpActions = ({ actions, onActionClick }) => {
  if (!actions?.length) return null

  return (
    <div className="rag-follow-up">
      {actions.map((action) => (
        <button key={action.id} type="button" onClick={() => onActionClick(action)}>
          {action.label}
        </button>
      ))}
    </div>
  )
}

export default RAGFollowUpActions
