'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { completeOnboarding } from '@/lib/actions/onboarding'
import { slides } from './slide-data'

interface OnboardingSlideshowProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingSlideshow({ isOpen, onClose }: OnboardingSlideshowProps) {
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const slide = slides[currentSlide]
  const isFinal = slide.isFinal ?? false
  const isFirst = currentSlide === 0
  const isLast = currentSlide === slides.length - 1

  const handleClose = useCallback(async () => {
    await completeOnboarding()
    onClose()
  }, [onClose])

  const goNext = useCallback(() => {
    if (!isLast) {
      setCurrentSlide((prev) => prev + 1)
    }
  }, [isLast])

  const goBack = useCallback(() => {
    if (!isFirst) {
      setCurrentSlide((prev) => prev - 1)
    }
  }, [isFirst])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])

  const handleCTA = useCallback(
    async (path: string) => {
      await completeOnboarding()
      onClose()
      router.push(path)
    },
    [onClose, router]
  )

  const handleExplore = useCallback(async () => {
    await completeOnboarding()
    onClose()
  }, [onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          if (!isFinal) goNext()
          break
        case 'ArrowLeft':
          goBack()
          break
        case 'Escape':
          handleClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isFinal, goNext, goBack, handleClose])

  // Body scroll lock + focus management
  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'
    containerRef.current?.focus()

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const { Icon } = slide

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — no onClick to prevent accidental dismissal */}
      <div className="absolute inset-0 bg-gray-500/75" aria-hidden="true" />

      {/* Modal container */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to GreekWheel"
        tabIndex={-1}
        className="relative w-full max-w-lg mx-4 bg-white rounded-lg shadow-xl outline-none"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <button
            type="button"
            aria-label="Skip onboarding"
            onClick={handleClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            aria-label="Close onboarding"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide content */}
        <div
          key={currentSlide}
          className="flex flex-col items-center text-center px-8 pt-4 pb-6 min-h-[320px] animate-fade-in"
          style={{ animation: 'fadeIn 0.2s ease-in-out' }}
        >
          {/* Icon */}
          <div className="mb-5">
            {Icon === null ? (
              <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">&#920;</span>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                <Icon className="w-8 h-8 text-primary-500" />
              </div>
            )}
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">{slide.heading}</h2>

          {/* Body */}
          <p className="text-neutral-600 max-w-sm leading-relaxed">{slide.body}</p>
        </div>

        {/* Progress dots */}
        <div
          role="tablist"
          aria-label="Slide progress"
          className="flex items-center justify-center gap-2 px-6 pb-4"
        >
          {slides.map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={index === currentSlide}
              aria-label={`Slide ${index + 1}`}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-primary-500 w-4'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Navigation footer */}
        <div className="px-6 pb-6">
          {isFinal ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleCTA('/deposits')}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors text-sm"
                >
                  Record a Deposit
                </button>
                <button
                  type="button"
                  onClick={() => handleCTA('/trades/new')}
                  className="flex-1 px-4 py-2 border border-primary-500 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-colors text-sm"
                >
                  Create a Trade
                </button>
              </div>
              <button
                type="button"
                onClick={handleExplore}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-1"
              >
                Explore on My Own
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={isFirst}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isFirst
                    ? 'invisible'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="px-6 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
