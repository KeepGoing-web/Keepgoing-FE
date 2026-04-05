import LoadingDots from './LoadingDots'
import './PageLoader.css'

const PageLoader = ({ label = '로딩 중...' }) => (
  <div className="page-loader" role="status" aria-live="polite">
    <LoadingDots />
    <p className="page-loader__label">{label}</p>
  </div>
)

export default PageLoader
