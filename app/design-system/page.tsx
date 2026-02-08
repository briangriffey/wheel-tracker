'use client'

import React, { useState } from 'react'
import { Button } from '@/components/design-system/button/button'
import { Badge } from '@/components/design-system/badge/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert/alert'

/**
 * Design System Gallery
 *
 * Interactive showcase of all design system components with live examples,
 * variant toggles, and code snippets for stakeholder demonstration.
 */
export default function DesignSystemPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Wheel Tracker Design System
          </h1>
          <p className="mt-2 text-gray-600">
            Interactive component gallery and documentation
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to the Design System
            </h2>
            <p className="text-gray-700 mb-4">
              This design system provides a consistent, reusable set of components
              built with accessibility, performance, and developer experience in mind.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700 mb-1">3</div>
                <div className="text-sm text-green-600">Components</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700 mb-1">20+</div>
                <div className="text-sm text-blue-600">Variants</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700 mb-1">100%</div>
                <div className="text-sm text-purple-600">Accessible</div>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Color Palette</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Primary Green */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Primary Green
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { shade: '50', color: '#F0FDF7' },
                  { shade: '100', color: '#DCFCE9' },
                  { shade: '200', color: '#BBF7D6' },
                  { shade: '300', color: '#86EFBB' },
                  { shade: '400', color: '#62D995' },
                ].map((item) => (
                  <div key={item.shade} className="text-center">
                    <div
                      className="h-20 rounded-lg shadow-sm border border-gray-200 mb-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-xs font-medium text-gray-700">
                      {item.shade}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {item.color}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {[
                  { shade: '500', color: '#43D984', label: 'DEFAULT' },
                  { shade: '600', color: '#3A8C5D' },
                  { shade: '700', color: '#2F7148' },
                  { shade: '800', color: '#27593A' },
                  { shade: '900', color: '#1F4730' },
                ].map((item) => (
                  <div key={item.shade} className="text-center">
                    <div
                      className="h-20 rounded-lg shadow-sm border border-gray-200 mb-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-xs font-medium text-gray-700">
                      {item.shade}
                      {item.label && (
                        <span className="ml-1 text-green-600">★</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {item.color}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic Colors */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Semantic Colors
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { name: 'Success', color: '#43D984', class: 'bg-green-500' },
                  { name: 'Error', color: '#EF4444', class: 'bg-red-500' },
                  { name: 'Warning', color: '#F59E0B', class: 'bg-yellow-500' },
                  { name: 'Info', color: '#3B82F6', class: 'bg-blue-500' },
                ].map((item) => (
                  <div key={item.name} className="text-center">
                    <div className={`h-20 rounded-lg shadow-sm mb-2 ${item.class}`} />
                    <div className="text-sm font-medium text-gray-700">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {item.color}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Button Component */}
        <ComponentSection
          title="Button"
          description="Versatile button component with multiple variants, sizes, and states."
          id="button"
        >
          {/* Variants */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Variants
            </h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <CodeBlock
              code={`<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>`}
              id="button-variants"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* Sizes */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Sizes
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <CodeBlock
              code={`<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>`}
              id="button-sizes"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* States */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              States
            </h4>
            <div className="flex flex-wrap gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
            <CodeBlock
              code={`<Button loading>Loading</Button>
<Button disabled>Disabled</Button>`}
              id="button-states"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Badge Component */}
        <ComponentSection
          title="Badge"
          description="Small status indicators and labels with multiple color variants."
          id="badge"
        >
          {/* Variants */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Variants
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <CodeBlock
              code={`<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="outline">Outline</Badge>`}
              id="badge-variants"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* Sizes */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Sizes
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
              <Badge size="lg">Large</Badge>
            </div>
            <CodeBlock
              code={`<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>`}
              id="badge-sizes"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* Removable */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Removable
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success" onRemove={() => alert('Removed!')}>
                Click X to remove
              </Badge>
            </div>
            <CodeBlock
              code={`<Badge variant="success" onRemove={() => console.log('Removed')}>
  Removable Badge
</Badge>`}
              id="badge-removable"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Alert Component */}
        <ComponentSection
          title="Alert"
          description="Contextual feedback messages with variants for different notification types."
          id="alert"
        >
          {/* Variants */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Variants
            </h4>
            <div className="space-y-4">
              <Alert variant="info">
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is an informational message for the user.
                </AlertDescription>
              </Alert>
              <Alert variant="success">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your changes have been saved successfully.
                </AlertDescription>
              </Alert>
              <Alert variant="warning">
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Please review your settings before continuing.
                </AlertDescription>
              </Alert>
              <Alert variant="error">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  An error occurred while processing your request.
                </AlertDescription>
              </Alert>
            </div>
            <CodeBlock
              code={`<Alert variant="info">
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is an informational message.
  </AlertDescription>
</Alert>`}
              id="alert-variants"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* Dismissible */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Dismissible
            </h4>
            <Alert variant="success" dismissible onDismiss={() => console.log('Dismissed')}>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Click the X button to dismiss this alert.
              </AlertDescription>
            </Alert>
            <CodeBlock
              code={`<Alert variant="success" dismissible onDismiss={() => console.log('Dismissed')}>
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>
    Dismissible alert message.
  </AlertDescription>
</Alert>`}
              id="alert-dismissible"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            Wheel Tracker Design System • Built with Next.js, React, TypeScript, and Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  )
}

/**
 * Component Section Wrapper
 */
interface ComponentSectionProps {
  title: string
  description: string
  id: string
  children: React.ReactNode
}

function ComponentSection({ title, description, id, children }: ComponentSectionProps) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {children}
      </div>
    </section>
  )
}

/**
 * Code Block Component
 */
interface CodeBlockProps {
  code: string
  id: string
  copiedCode: string | null
  onCopy: (code: string, id: string) => void
}

function CodeBlock({ code, id, copiedCode, onCopy }: CodeBlockProps) {
  return (
    <div className="mt-4 relative">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
      >
        {copiedCode === id ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  )
}
