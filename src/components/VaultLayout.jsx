import { Outlet } from 'react-router-dom'
import { VaultProvider } from '../contexts/VaultContext'
import VaultSidebar from './VaultSidebar'
import './VaultLayout.css'

const VaultLayout = () => {
  return (
    <VaultProvider>
      <div className="vault-layout">
        <VaultSidebar />
        <div className="vault-main">
          <Outlet />
        </div>
      </div>
    </VaultProvider>
  )
}

export default VaultLayout
