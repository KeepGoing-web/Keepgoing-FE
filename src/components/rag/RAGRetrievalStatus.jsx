const RAGRetrievalStatus = ({ retrieval, status }) => {
  return (
    <div className="rag-retrieval">
      <p className="rag-retrieval__title">
        {status === 'answering' ? '근거를 정리해 답변을 작성하는 중입니다.' : '질문에 맞는 문서를 찾는 중입니다.'}
      </p>
      <ul>
        <li>{retrieval?.scannedCount ?? 0}개 문서를 확인했습니다</li>
        <li>{retrieval?.matchedCount ?? 0}개 문서를 후보로 좁혔습니다</li>
        <li>{retrieval?.selectedChunks ?? 0}개 인용 문단을 준비했습니다</li>
      </ul>
    </div>
  )
}

export default RAGRetrievalStatus
