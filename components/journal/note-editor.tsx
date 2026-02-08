'use client'

import { useState } from 'react'

interface NoteEditorProps {
  initialNote: string
  onSave: (note: string) => void
  onCancel: () => void
}

export function NoteEditor({ initialNote, onSave, onCancel }: NoteEditorProps) {
  const [note, setNote] = useState(initialNote)

  const handleSave = () => {
    onSave(note)
  }

  return (
    <div className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add notes about this trade..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        rows={3}
        maxLength={1000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{note.length}/1000 characters</span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
