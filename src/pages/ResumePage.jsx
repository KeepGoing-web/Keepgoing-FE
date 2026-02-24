import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import './ResumePage.css'

const ResumePage = () => {
  const toast = useToast()
  const [resumeType, setResumeType] = useState('resume')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setGeneratedContent('')

    try {
      // TODO: API 호출로 자기소개서/이력서 생성
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const mockContent = `생성된 ${resumeType === 'resume' ? '이력서' : '자기소개서'} 내용입니다.\n\n작성한 포스트들을 기반으로 AI가 생성한 내용이 여기에 표시됩니다.\n\n추가 정보: ${additionalInfo || '없음'}`
      setGeneratedContent(mockContent)
    } catch (error) {
      console.error('생성 실패:', error)
      toast.error('생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    toast.success('클립보드에 복사되었습니다.')
  }

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resumeType === 'resume' ? '이력서' : '자기소개서'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="resume-page">
      <div className="page-header">
        <h1>이력서 / 자기소개서 생성</h1>
        <p className="page-description">
          작성한 포스트들을 기반으로 AI가 이력서나 자기소개서를 생성합니다.
          <br />
          <span className="page-hint">AI 수집이 허용된 포스트의 내용이 분석됩니다. 추가 정보를 입력하면 더 정확한 결과를 얻을 수 있습니다.</span>
        </p>
      </div>
      <div className="resume-container">
        <div className="resume-form">
          <div className="form-group">
            <label htmlFor="resume-type">생성할 문서 선택</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="resume-type"
                  value="resume"
                  checked={resumeType === 'resume'}
                  onChange={(e) => setResumeType(e.target.value)}
                />
                이력서
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="resume-type"
                  value="cover-letter"
                  checked={resumeType === 'cover-letter'}
                  onChange={(e) => setResumeType(e.target.value)}
                />
                자기소개서
              </label>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="additional-info">
              추가 정보 (선택사항)
            </label>
            <textarea
              id="additional-info"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="생성 시 참고할 추가 정보를 입력하세요 (예: 지원 회사, 직무 등)"
              rows={5}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="generate-button"
          >
            {loading ? '생성 중...' : '생성하기'}
          </button>
        </div>
        {generatedContent && (
          <div className="generated-content">
            <div className="content-header">
              <h2>
                생성된 {resumeType === 'resume' ? '이력서' : '자기소개서'}
              </h2>
              <div className="content-actions">
                <button onClick={handleCopy} className="action-button">
                  복사
                </button>
                <button onClick={handleDownload} className="action-button">
                  다운로드
                </button>
              </div>
            </div>
            <div className="content-text">{generatedContent}</div>
          </div>
        )}
        {loading && !generatedContent && (
          <div className="loading-state">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>AI가 포스트를 분석하여 문서를 생성하고 있습니다...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResumePage

