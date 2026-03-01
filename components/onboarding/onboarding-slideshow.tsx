'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/design-system'
import { completeOnboarding } from '@/lib/actions/onboarding'
import { slides } from './slide-data'

interface OnboardingSlideshowProps {
  isOpen: boolean
}

export function OnboardingSlideshow({ isOpen }: OnboardingSlideshowProps) {
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const slide = slides[currentSlide]
  const isFirst = currentSlide === 0
  const isLast = currentSlide === slides.length - 1

  // Body scroll lock + focus on open
  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'
    containerRef.current?.focus()

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleClose = useCallback(async () => {
    document.body.style.overflow = ''
    await completeOnboarding()
  }, [])

  const goNext = useCallback(() => {
    if (!isLast) setCurrentSlide((s) => s + 1)
  }, [isLast])

  const goBack = useCallback(() => {
    if (!isFirst) setCurrentSlide((s) => s - 1)
  }, [isFirst])

  const handleSkip = useCallback(async () => {
    await handleClose()
  }, [handleClose])

  const handleCTA = useCallback(
    async (path: string) => {
      await completeOnboarding()
      router.push(path)
    },
    [router]
  )

  const handleExplore = useCallback(async () => {
    await handleClose()
  }, [handleClose])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!isLast) goNext()
      } else if (e.key === 'ArrowLeft') {
        goBack()
      } else if (e.key === 'Escape') {
        handleSkip()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isLast, goNext, goBack, handleSkip])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to GreekWheel"
    >
      {/* Backdrop — no onClick to prevent accidental dismissal */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={containerRef}
          tabIndex={-1}
          className="relative w-full max-w-lg rounded-lg bg-white shadow-xl focus:outline-none"
        >
          {/* Top bar: Skip + X */}
          <div className="flex items-center justify-between px-6 pt-5">
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip onboarding"
              className="text-sm text-neutral-500 hover:text-neutral-700 underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Close onboarding"
              className="rounded-md text-neutral-400 hover:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Slide content — key forces re-mount for fade */}
          <div
            key={currentSlide}
            className="flex flex-col items-center text-center px-6 pt-6 pb-4 min-h-[280px] animate-fade-in"
            style={{ animation: 'fadeIn 0.2s ease-in-out' }}
          >
            {/* Icon */}
            <div className="mb-5">
              {slide.Icon === null ? (
                <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white font-bold text-3xl" aria-hidden="true">
                    &#920;
                  </span>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                  <slide.Icon className="w-8 h-8 text-primary-500" aria-hidden="true" />
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
            className="flex justify-center gap-2 pb-4"
            role="tablist"
            aria-label="Slide progress"
          >
            {slides.map((s, index) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={index === currentSlide}
                aria-label={`Slide ${index + 1}`}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  index === currentSlide
                    ? 'bg-primary-500'
                    : 'bg-neutral-300 hover:bg-neutral-400'
                }`}
              />
            ))}
          </div>

          {/* Navigation footer */}
          <div className="px-6 pb-6">
            {isLast ? (
              /* Final slide CTAs */
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => handleCTA('/deposits')}
                  >
                    Record a Deposit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCTA('/trades/new')}
                  >
                    Create a Trade
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleExplore}
                  className="text-sm text-neutral-500 hover:text-neutral-700 underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded mx-auto"
                >
                  Explore on My Own
                </button>
              </div>
            ) : (
              /* Normal slide navigation */
              <div className="flex items-center justify-between">
                <div className="w-20">
                  {!isFirst && (
                    <Button variant="ghost" size="sm" onClick={goBack}>
                      Back
                    </Button>
                  )}
                </div>
                <Button variant="primary" onClick={goNext}>
                  Next
                </Button>
                <div className="w-20" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fade-in keyframe */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
