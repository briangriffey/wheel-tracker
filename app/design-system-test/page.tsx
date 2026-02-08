'use client'

import React, { useState } from 'react'
import { Button } from '@/components/design-system/button'
import { Badge } from '@/components/design-system/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert'

/**
 * Design System Test Page
 *
 * Comprehensive manual testing page for all design system components.
 * Tests all variants, sizes, states, and combinations.
 */
export default function DesignSystemTestPage() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Design System Component Testing
          </h1>
          <p className="text-gray-600">
            Comprehensive testing of all design system components across variants, sizes, and states.
          </p>
        </div>

        {/* Button Component Tests */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Button Component</h2>

          <div className="space-y-8">
            {/* Variants */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sizes</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* States */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">States</h3>
              <div className="flex flex-wrap gap-4">
                <Button>Normal</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button loading={loading} onClick={() => {
                  setLoading(true)
                  setTimeout(() => setLoading(false), 2000)
                }}>
                  Click to Load
                </Button>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">With Icons</h3>
              <div className="flex flex-wrap gap-4">
                <Button
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                >
                  Left Icon
                </Button>
                <Button
                  rightIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  }
                >
                  Right Icon
                </Button>
                <Button
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                  rightIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  }
                >
                  Both Icons
                </Button>
              </div>
            </div>

            {/* Combinations */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Variant + Size Combinations</h3>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="primary" size="sm">Primary Small</Button>
                  <Button variant="primary" size="md">Primary Medium</Button>
                  <Button variant="primary" size="lg">Primary Large</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="destructive" size="sm">Destructive Small</Button>
                  <Button variant="destructive" size="md">Destructive Medium</Button>
                  <Button variant="destructive" size="lg">Destructive Large</Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Badge Component Tests */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Badge Component</h2>

          <div className="space-y-8">
            {/* Variants */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sizes</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </div>
            </div>

            {/* Removable */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Removable</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="info" removable onRemove={() => alert('Badge removed!')}>
                  Removable Info
                </Badge>
                <Badge variant="success" removable onRemove={() => alert('Badge removed!')}>
                  Removable Success
                </Badge>
                <Badge variant="error" size="sm" removable onRemove={() => alert('Badge removed!')}>
                  Small Removable
                </Badge>
              </div>
            </div>

            {/* Combinations */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Variant + Size Combinations</h3>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4 items-center">
                  <Badge variant="success" size="sm">Success Small</Badge>
                  <Badge variant="success" size="md">Success Medium</Badge>
                  <Badge variant="success" size="lg">Success Large</Badge>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <Badge variant="error" size="sm">Error Small</Badge>
                  <Badge variant="error" size="md">Error Medium</Badge>
                  <Badge variant="error" size="lg">Error Large</Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alert Component Tests */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Alert Component</h2>

          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Variants</h3>
              <div className="space-y-4">
                <Alert variant="info">
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    This is an informational alert message.
                  </AlertDescription>
                </Alert>

                <Alert variant="success">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Your action was completed successfully.
                  </AlertDescription>
                </Alert>

                <Alert variant="warning">
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Please review this warning before proceeding.
                  </AlertDescription>
                </Alert>

                <Alert variant="error">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    An error occurred. Please try again.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Dismissible */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dismissible Alerts</h3>
              <div className="space-y-4">
                <Alert variant="info" dismissible onDismiss={() => alert('Alert dismissed!')}>
                  <AlertTitle>Dismissible Info</AlertTitle>
                  <AlertDescription>
                    Click the X button to dismiss this alert.
                  </AlertDescription>
                </Alert>

                <Alert variant="warning" dismissible>
                  <AlertTitle>Dismissible Warning</AlertTitle>
                  <AlertDescription>
                    This warning can be dismissed by clicking the close button.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Title Only */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Title Only</h3>
              <div className="space-y-4">
                <Alert variant="success">
                  <AlertTitle>Success! Changes saved.</AlertTitle>
                </Alert>

                <Alert variant="error">
                  <AlertTitle>Failed to save changes.</AlertTitle>
                </Alert>
              </div>
            </div>

            {/* Description Only */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Description Only</h3>
              <div className="space-y-4">
                <Alert variant="info">
                  <AlertDescription>
                    This is a simple informational message without a title.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive Testing */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Responsive Testing</h2>
          <p className="text-gray-600 mb-4">
            Resize your browser window to test responsive behavior (mobile, tablet, desktop).
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Button className="w-full">Responsive Button 1</Button>
              <Button className="w-full" variant="secondary">Responsive Button 2</Button>
              <Button className="w-full" variant="outline">Responsive Button 3</Button>
              <Button className="w-full" variant="ghost">Responsive Button 4</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Tag 1</Badge>
              <Badge variant="success">Tag 2</Badge>
              <Badge variant="error">Tag 3</Badge>
              <Badge variant="warning">Tag 4</Badge>
              <Badge variant="info">Tag 5</Badge>
            </div>

            <Alert variant="info">
              <AlertTitle>Responsive Alert</AlertTitle>
              <AlertDescription>
                This alert should adjust properly on different screen sizes.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Accessibility Testing */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Accessibility Testing</h2>
          <p className="text-gray-600 mb-4">
            Test keyboard navigation: Tab through elements, Enter/Space to activate buttons,
            Escape on dismissible alerts.
          </p>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button aria-label="Save document">Save</Button>
              <Button variant="destructive" aria-label="Delete item">Delete</Button>
              <Badge removable aria-label="Premium badge">Premium</Badge>
            </div>

            <Alert variant="warning" dismissible>
              <AlertTitle>Keyboard Accessible</AlertTitle>
              <AlertDescription>
                Use Tab to focus the close button, then press Enter to dismiss.
              </AlertDescription>
            </Alert>
          </div>
        </section>
      </div>
    </div>
  )
}
