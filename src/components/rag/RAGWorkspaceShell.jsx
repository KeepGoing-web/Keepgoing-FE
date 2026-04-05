import './RAGWorkspace.css'
import RAGScopePanel from './RAGScopePanel'
import RAGConversationPane from './RAGConversationPane'
import RAGEvidencePanel from './RAGEvidencePanel'

const RAGWorkspaceShell = ({ rag }) => {
  return (
    <div className="rag-workspace">
      <aside className="rag-workspace__scope">
        <RAGScopePanel rag={rag} />
      </aside>

      <section className="rag-workspace__conversation">
        <RAGConversationPane rag={rag} />
      </section>

      <aside className="rag-workspace__evidence">
        <RAGEvidencePanel rag={rag} />
      </aside>
    </div>
  )
}

export default RAGWorkspaceShell
