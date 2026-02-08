'use client'

import { useState, useRef, useEffect } from 'react'

interface TagInputProps {
  tags: string[]
  allTags: string[]
  onUpdate: (tags: string[]) => void
  disabled?: boolean
}

export function TagInput({ tags, allTags, onUpdate, disabled }: TagInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    if (input.trim()) {
      const filtered = allTags
        .filter((tag) => tag.toLowerCase().includes(input.toLowerCase()))
        .filter((tag) => !tags.includes(tag))
        .slice(0, 5)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }, [input, allTags, tags])

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      onUpdate([...tags, trimmedTag])
      setInput('')
      setSuggestions([])
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0) {
        handleAddTag(suggestions[0])
      } else {
        handleAddTag(input)
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setInput('')
      setSuggestions([])
    }
  }

  if (!isEditing) {
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
          >
            {tag}
          </span>
        ))}
        <button
          onClick={() => setIsEditing(true)}
          disabled={disabled}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {tags.length === 0 ? '+ Add tags' : '+ Edit'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 mb-2">
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

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type to add tag..."
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={50}
        />

        {/* Autocomplete Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleAddTag(suggestion)}
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {tags.length}/10 tags • Press Enter to add
        </span>
        <button
          onClick={() => {
            setIsEditing(false)
            setInput('')
            setSuggestions([])
          }}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Done
        </button>
      </div>
    </div>
  )
}
