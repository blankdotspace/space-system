import React, { useState, useRef } from 'react'
import { DragControls } from 'framer-motion'
import { IconSelector } from './IconSelector'
import { EyeIcon, EyeOffIcon, GripVerticalIcon } from 'lucide-react'
import * as FaIcons from 'react-icons/fa6'
import * as BsIcons from 'react-icons/bs'
import * as GiIcons from 'react-icons/gi'
import type { IconType } from 'react-icons'
import { useUIColors } from '@/common/lib/hooks/useUIColors'

const ICON_PACK: Record<string, IconType> = {
  ...FaIcons,
  ...BsIcons,
  ...GiIcons,
}

export interface MiniApp {
  id: string | number
  name: string
  mobileDisplayName: string
  context?: string
  order: number
  icon: string
  displayOnMobile: boolean
  isImmutable?: boolean 
}

interface MiniAppSettingsProps {
  miniApp: MiniApp
  onUpdateMiniApp: (app: MiniApp) => void
  dragControls?: DragControls
  orderNumber?: number
}

export function MiniAppSettings({ miniApp, onUpdateMiniApp, dragControls, orderNumber }: MiniAppSettingsProps) {
  const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false)
  const iconButtonRef = useRef<HTMLButtonElement>(null)
  const uiColors = useUIColors()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateMiniApp({ ...miniApp, mobileDisplayName: e.target.value })
  }

  const handleIconSelect = (iconName: string) => {
    onUpdateMiniApp({ ...miniApp, icon: iconName })
    setIsIconSelectorOpen(false)
  }

  const toggleVisibility = () => {
    onUpdateMiniApp({ ...miniApp, displayOnMobile: !miniApp.displayOnMobile })
  }

  const getIconComponent = (iconName: string) => {
    if (!iconName) {
      return (
        <div className="w-6 h-6 bg-gray-100 flex items-center justify-center rounded">?</div>
      )
    }

    if (iconName.startsWith('http')) {
      return (
        <img src={iconName} alt="icon" className="w-6 h-6 rounded object-contain" />
      )
    }

    const Icon = ICON_PACK[iconName] as IconType | undefined
    if (Icon) {
      return <Icon className="w-6 h-6" />
    }

    return (
      <div className="w-6 h-6 bg-gray-100 flex items-center justify-center rounded">?</div>
    )
  }
  return (
    <div className="py-2 border-y">
      <div className="px-1">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-1 rounded shrink-0 ${
              miniApp.isImmutable 
                ? 'cursor-not-allowed text-gray-300' 
                : 'cursor-move hover:bg-gray-100 text-gray-400'
            }`}
            title={miniApp.isImmutable ? "Cannot be reordered" : "Drag to reorder"}
            onPointerDown={(e) => {
              if (!miniApp.isImmutable && dragControls) {
                dragControls.start(e);
              }
            }}
          >
            <GripVerticalIcon className="h-4 w-4" />
          </div>
          <span className="text-xs text-gray-400 w-4 text-center">
            {orderNumber ?? "-"}
          </span>
          <div className={`text-sm truncate flex-1 ${
            miniApp.isImmutable ? 'text-gray-400 italic' : 'text-gray-500'
          }`}>
            {miniApp.context}
            {miniApp.isImmutable && <span className="ml-1">(Fixed)</span>}
          </div>
          <button
            onClick={toggleVisibility}
            disabled={miniApp.isImmutable}
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{
              backgroundColor: miniApp.isImmutable 
                ? '#F3F4F6' 
                : miniApp.displayOnMobile 
                  ? `${uiColors.primaryColor}20` 
                  : '#F3F4F6',
              color: miniApp.isImmutable 
                ? '#D1D5DB' 
                : miniApp.displayOnMobile 
                  ? uiColors.primaryColor 
                  : '#9CA3AF',
              cursor: miniApp.isImmutable ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!miniApp.isImmutable) {
                e.currentTarget.style.backgroundColor = miniApp.displayOnMobile 
                  ? `${uiColors.primaryColor}40` 
                  : '#E5E7EB';
              }
            }}
            onMouseLeave={(e) => {
              if (!miniApp.isImmutable) {
                e.currentTarget.style.backgroundColor = miniApp.displayOnMobile 
                  ? `${uiColors.primaryColor}20` 
                  : '#F3F4F6';
              }
            }}
          >
            {miniApp.displayOnMobile ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeOffIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Display Name</label>
            <input
              type="text"
              value={miniApp.mobileDisplayName}
              onChange={handleNameChange}
              className="w-full h-10 px-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
              style={{
                '--tw-ring-color': uiColors.primaryColor,
              } as React.CSSProperties}
              placeholder="Display name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Icon</label>
            <button
              type="button"
              ref={iconButtonRef}
              onClick={() => setIsIconSelectorOpen(!isIconSelectorOpen)}
              className="h-10 w-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2"
              style={{
                '--tw-ring-color': uiColors.primaryColor,
              } as React.CSSProperties}
            >
              {getIconComponent(miniApp.icon)}
            </button>
            {isIconSelectorOpen && (
              <IconSelector
                onSelectIcon={handleIconSelect}
                triggerRef={iconButtonRef}
                onClose={() => setIsIconSelectorOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MiniAppSettings
