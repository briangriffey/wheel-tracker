'use client'

import { useState } from 'react'
import { bulkUpdateTags } from '@/lib/actions/trades'
import { exportTradesToCSV } from '@/lib/actions/export'

interface BulkActionsProps {
  selectedTradeIds: string[]
  onComplete: () => void
}

export function BulkActions({ selectedTradeIds, onComplete }: BulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleBulkTag = async () => {
    if (tags.length === 0) {
      alert('Please add at least one tag')
      return
    }

    setLoading(true)
    try {
      const result = await bulkUpdateTags(selectedTradeIds, tags)
      if (result.success) {
        alert(`Successfully updated ${result.data.count} trades`)
        setTags([])
        setTagInput('')
        setIsOpen(false)
        onComplete()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch {
      alert('Failed to update tags')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    setLoading(true)
    try {
      const csv = await exportTradesToCSV(selectedTradeIds)

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `trades_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to export CSV')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-blue-900">
          {selectedTradeIds.length} trade{selectedTradeIds.length !== 1 ? 's' : ''} selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50"
          >
            Bulk Tag
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-3">
            Add tags to selected trades
          </h4>

          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900"
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Type tag and press Enter"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">
              {tags.length}/10 tags
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  setTags([])
                  setTagInput('')
                }}
                className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkTag}
                disabled={loading || tags.length === 0}
                className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Applying...' : 'Apply Tags'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
