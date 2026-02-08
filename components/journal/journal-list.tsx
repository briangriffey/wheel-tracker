'use client'

import { useState, useMemo } from 'react'
import type { Trade, TradeOutcome } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'
import { updateTrade } from '@/lib/actions/trades'
import { NoteEditor } from './note-editor'
import { TagInput } from './tag-input'
import { OutcomeSelector } from './outcome-selector'
import { BulkActions } from './bulk-actions'

interface JournalListProps {
  initialTrades: Trade[]
}

export function JournalList({ initialTrades }: JournalListProps) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [outcomeFilter, setOutcomeFilter] = useState<TradeOutcome | 'ALL'>('ALL')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Get all unique tags from trades
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    trades.forEach((trade) => {
      trade.tags.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [trades])

  // Filter trades
  const filteredTrades = useMemo(() => {
    let filtered = [...trades]

    // Search in notes and ticker
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (trade) =>
          trade.ticker.toLowerCase().includes(query) ||
          (trade.notes && trade.notes.toLowerCase().includes(query))
      )
    }

    // Filter by tags (show trades that have ANY of the selected tags)
    if (tagFilter.length > 0) {
      filtered = filtered.filter((trade) =>
        tagFilter.some((tag) => trade.tags.includes(tag))
      )
    }

    // Filter by outcome
    if (outcomeFilter !== 'ALL') {
      filtered = filtered.filter((trade) => trade.outcome === outcomeFilter)
    }

    return filtered
  }, [trades, searchQuery, tagFilter, outcomeFilter])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTrades(new Set(filteredTrades.map((t) => t.id)))
    } else {
      setSelectedTrades(new Set())
    }
  }

  // Handle select one
  const handleSelectOne = (tradeId: string, checked: boolean) => {
    const newSelected = new Set(selectedTrades)
    if (checked) {
      newSelected.add(tradeId)
    } else {
      newSelected.delete(tradeId)
    }
    setSelectedTrades(newSelected)
  }

  // Handle note save
  const handleNoteSave = async (tradeId: string, notes: string) => {
    setLoadingAction(tradeId)
    try {
      const result = await updateTrade({ id: tradeId, notes })
      if (result.success) {
        setTrades(trades.map((t) => (t.id === tradeId ? { ...t, notes } : t)))
        setEditingNote(null)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch {
      alert('Failed to update note')
    } finally {
      setLoadingAction(null)
    }
  }

  // Handle tags update
  const handleTagsUpdate = async (tradeId: string, tags: string[]) => {
    setLoadingAction(tradeId)
    try {
      const result = await updateTrade({ id: tradeId, tags })
      if (result.success) {
        setTrades(trades.map((t) => (t.id === tradeId ? { ...t, tags } : t)))
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch {
      alert('Failed to update tags')
    } finally {
      setLoadingAction(null)
    }
  }

  // Handle outcome update
  const handleOutcomeUpdate = async (tradeId: string, outcome: TradeOutcome | null) => {
    setLoadingAction(tradeId)
    try {
      const result = await updateTrade({ id: tradeId, outcome: outcome ?? undefined })
      if (result.success) {
        setTrades(trades.map((t) => (t.id === tradeId ? { ...t, outcome } : t)))
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch {
      alert('Failed to update outcome')
    } finally {
      setLoadingAction(null)
    }
  }

  // Format currency
  const formatCurrency = (value: Prisma.Decimal) => {
    return `$${value.toNumber().toFixed(2)}`
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="w-full space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Notes/Ticker
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tag Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Tags
            </label>
            <select
              multiple
              value={tagFilter}
              onChange={(e) =>
                setTagFilter(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>

          {/* Outcome Filter */}
          <div>
            <label htmlFor="outcome-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Outcome
            </label>
            <select
              id="outcome-filter"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as TradeOutcome | 'ALL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Outcomes</option>
              <option value="GREAT">Great</option>
              <option value="OKAY">Okay</option>
              <option value="MISTAKE">Mistake</option>
              <option value="LEARNING">Learning</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchQuery || tagFilter.length > 0 || outcomeFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('')
              setTagFilter([])
              setOutcomeFilter('ALL')
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedTrades.size > 0 && (
        <BulkActions
          selectedTradeIds={Array.from(selectedTrades)}
          onComplete={() => {
            setSelectedTrades(new Set())
            // Refresh trades list (in production, re-fetch from server)
            window.location.reload()
          }}
        />
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredTrades.length} of {trades.length} trades
        {selectedTrades.size > 0 && ` • ${selectedTrades.size} selected`}
      </div>

      {/* Empty State */}
      {filteredTrades.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No trades found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {trades.length === 0
              ? 'Get started by creating your first trade.'
              : 'Try adjusting your filters to find what you\'re looking for.'}
          </p>
        </div>
      )}

      {/* Desktop Table View */}
      {filteredTrades.length > 0 && (
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredTrades.length > 0 &&
                      filteredTrades.every((t) => selectedTrades.has(t.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Premium
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTrades.has(trade.id)}
                      onChange={(e) => handleSelectOne(trade.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.ticker}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.type === 'PUT'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(trade.premium as Prisma.Decimal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(trade.expirationDate)}
                  </td>
                  <td className="px-6 py-4">
                    <TagInput
                      tags={trade.tags}
                      allTags={allTags}
                      onUpdate={(tags) => handleTagsUpdate(trade.id, tags)}
                      disabled={loadingAction === trade.id}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <OutcomeSelector
                      outcome={trade.outcome}
                      onUpdate={(outcome) => handleOutcomeUpdate(trade.id, outcome)}
                      disabled={loadingAction === trade.id}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {editingNote === trade.id ? (
                        <NoteEditor
                          initialNote={trade.notes || ''}
                          onSave={(note) => handleNoteSave(trade.id, note)}
                          onCancel={() => setEditingNote(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-700 truncate">
                            {trade.notes || 'No notes'}
                          </p>
                          <button
                            onClick={() => setEditingNote(trade.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {filteredTrades.length > 0 && (
        <div className="md:hidden space-y-4">
          {filteredTrades.map((trade) => (
            <div key={trade.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedTrades.has(trade.id)}
                  onChange={(e) => handleSelectOne(trade.id, e.target.checked)}
                  className="rounded border-gray-300 mt-1"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{trade.ticker}</h3>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.type === 'PUT'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {trade.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Premium:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(trade.premium as Prisma.Decimal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expiration:</span>
                  <span className="font-medium text-gray-900">{formatDate(trade.expirationDate)}</span>
                </div>

                <div>
                  <label className="text-sm text-gray-500">Tags:</label>
                  <TagInput
                    tags={trade.tags}
                    allTags={allTags}
                    onUpdate={(tags) => handleTagsUpdate(trade.id, tags)}
                    disabled={loadingAction === trade.id}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500">Outcome:</label>
                  <OutcomeSelector
                    outcome={trade.outcome}
                    onUpdate={(outcome) => handleOutcomeUpdate(trade.id, outcome)}
                    disabled={loadingAction === trade.id}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">Notes:</label>
                  {editingNote === trade.id ? (
                    <NoteEditor
                      initialNote={trade.notes || ''}
                      onSave={(note) => handleNoteSave(trade.id, note)}
                      onCancel={() => setEditingNote(null)}
                    />
                  ) : (
                    <div>
                      <p className="text-sm text-gray-700">{trade.notes || 'No notes'}</p>
                      <button
                        onClick={() => setEditingNote(trade.id)}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit Note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
