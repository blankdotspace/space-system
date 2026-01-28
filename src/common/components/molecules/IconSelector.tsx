import React, { useEffect, useState, useRef } from 'react'
import { SearchIcon, UploadIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import * as FaIcons from 'react-icons/fa6'
import * as BsIcons from 'react-icons/bs'
import * as GiIcons from 'react-icons/gi'
import type { IconType } from 'react-icons'
import { DEFAULT_FIDGET_ICON_MAP } from '@/constants/mobileFidgetIcons'
import HomeIcon from '@/common/components/atoms/icons/HomeIcon'
import ExploreIcon from '@/common/components/atoms/icons/ExploreIcon'
import NotificationsIcon from '@/common/components/atoms/icons/NotificationsIcon'
import NavSearchIcon from '@/common/components/atoms/icons/SearchIcon'
import RocketIcon from '@/common/components/atoms/icons/RocketIcon'
import RobotIcon from '@/common/components/atoms/icons/RobotIcon'
import ImgBBUploader from './ImgBBUploader'

const ICON_PACK: Record<string, IconType> = {
  ...FaIcons,
  ...BsIcons,
  ...GiIcons,
}

const CUSTOM_NAV_ICONS: Record<string, React.FC> = {
  home: HomeIcon,
  explore: ExploreIcon,
  notifications: NotificationsIcon,
  search: NavSearchIcon,
  space: RocketIcon,
  robot: RobotIcon,
}

interface IconSelectorProps {
  onSelectIcon: (icon: string) => void
  triggerRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

export function IconSelector({ onSelectIcon, triggerRef, onClose }: IconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library')
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 400 })
  const dropdownRef = useRef<HTMLDivElement>(null)

  const iconLibrary = [
    // Default navigation icons
    'home',
    'explore',
    'notifications',
    'search',
    'space',
    'robot',
    // Bootstrap outline icons
    'BsGrid',
    'BsColumnsGap',
    'BsLayoutTextWindow',
    'BsCollection',
    'BsTrophy',
    'BsDiamond',
    'BsActivity',
    'BsShield',
    'BsEye',
    'BsJoystick',
    // Fidget icons
    ...Object.values(DEFAULT_FIDGET_ICON_MAP),
  ]
  const uniqueIcons = Array.from(new Set(
    iconLibrary.filter((icon) => !icon.includes('Fill') && !icon.includes('Solid'))
  ))
  const filteredIcons = uniqueIcons.filter((icon) =>
    icon.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  useEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const windowWidth = window.innerWidth
      const dropdownWidth = Math.max(320, rect.width)
      const spaceBelow = windowHeight - rect.bottom - 16
      const spaceAbove = rect.top - 16
      let maxDropdownHeight = 400
      let top = rect.bottom + window.scrollY + 4
      if (spaceBelow >= 300 || spaceBelow > spaceAbove) {
        maxDropdownHeight = Math.min(400, spaceBelow)
        top = rect.bottom + window.scrollY + 4
      } else {
        maxDropdownHeight = Math.min(400, spaceAbove)
        top = rect.top + window.scrollY - maxDropdownHeight - 4
        if (top < 16) top = 16 
      }
      let left = rect.left + window.scrollX
      if (left + dropdownWidth > windowWidth) {
        left = windowWidth - dropdownWidth - 16
      }
      setPosition({ top, left, width: dropdownWidth, maxHeight: maxDropdownHeight })
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [triggerRef, onClose])

  const handleIconSelect = (icon: string) => {
    onSelectIcon(icon)
    onClose()
  }

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-auto"
      style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${position.width}px`, maxHeight: `${position.maxHeight}px` }}
    >
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search icons..."
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'library' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('library')}
        >
          Icon Library
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'custom' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('custom')}
        >
          Custom Upload
        </button>
      </div>
      {activeTab === 'library' ? (
        <div className="p-3 grid grid-cols-5 gap-2 overflow-auto max-h-[calc(100vh-100px)]" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {filteredIcons.length > 0 ? (
            filteredIcons.map((icon) => {
              const CustomIcon = CUSTOM_NAV_ICONS[icon]
              const ReactIcon = ICON_PACK[icon] as IconType | undefined
              return (
                <button
                  key={icon}
                  onClick={() => handleIconSelect(icon)}
                  className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded-md"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mb-1">
                    {CustomIcon ? <CustomIcon /> : ReactIcon ? <ReactIcon className="w-5 h-5" /> : icon.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-600 truncate w-full text-center">
                    {icon}
                  </span>
                </button>
              )
            })
          ) : (
            <div className="col-span-5 py-4 text-center text-gray-500">No icons found</div>
          )}
        </div>
      ) : (
        <div className="p-6 flex flex-col items-center justify-center overflow-auto max-h-[calc(100vh-100px)]" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <UploadIcon className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Upload a custom icon (SVG, PNG, or JPG)
          </p>
          <ImgBBUploader onImageUploaded={handleIconSelect} />
        </div>
      )}
    </div>,
    document.body,
  )
}

export default IconSelector
