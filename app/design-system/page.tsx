'use client'

import React, { useState } from 'react'
import { Button } from '@/components/design-system/button/button'
import { Badge } from '@/components/design-system/badge/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert/alert'
import { Input } from '@/components/design-system/input/input'
import { Select } from '@/components/design-system/select/select'
import { Spinner, SpinnerOverlay } from '@/components/ui/spinner'
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorMessage } from '@/components/ui/error-message'
import { HelpIcon, HelpTooltip } from '@/components/ui/help-icon'

/**
 * Design System Gallery
 *
 * Interactive showcase of all design system components with live examples,
 * variant toggles, and code snippets for stakeholder demonstration.
 */
export default function DesignSystemPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSpinnerOverlay, setShowSpinnerOverlay] = useState(false)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-neutral-900">
            Wheel Tracker Design System
          </h1>
          <p className="mt-2 text-neutral-600">
            Interactive component gallery and documentation
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Welcome to the Design System
            </h2>
            <p className="text-neutral-700 mb-4">
              This design system provides a consistent, reusable set of components
              built with accessibility, performance, and developer experience in mind.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700 mb-1">12</div>
                <div className="text-sm text-green-600">Components</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700 mb-1">50+</div>
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
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Color Palette</h2>
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
            {/* Primary Green */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">
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
                      className="h-20 rounded-lg shadow-sm border border-neutral-200 mb-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-xs font-medium text-neutral-700">
                      {item.shade}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">
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
                      className="h-20 rounded-lg shadow-sm border border-neutral-200 mb-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-xs font-medium text-neutral-700">
                      {item.shade}
                      {item.label && (
                        <span className="ml-1 text-green-600">★</span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">
                      {item.color}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic Colors */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">
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
                    <div className="text-sm font-medium text-neutral-700">
                      {item.name}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
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

        {/* Input Component */}
        <ComponentSection
          title="Input"
          description="Form input component with validation states, sizes, and prefix/suffix support."
          id="input"
        >
          {/* Sizes */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Sizes
            </h4>
            <div className="space-y-3">
              <Input size="sm" placeholder="Small input" />
              <Input size="md" placeholder="Medium input (default)" />
              <Input size="lg" placeholder="Large input" />
            </div>
            <CodeBlock
              code={`<Input size="sm" placeholder="Small input" />
<Input size="md" placeholder="Medium input" />
<Input size="lg" placeholder="Large input" />`}
              id="input-sizes"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* States */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              States
            </h4>
            <div className="space-y-3">
              <Input placeholder="Default state" />
              <Input state="error" error="This field is required" placeholder="Error state" />
              <Input state="success" placeholder="Success state" />
              <Input disabled placeholder="Disabled state" />
            </div>
            <CodeBlock
              code={`<Input placeholder="Default state" />
<Input state="error" error="This field is required" />
<Input state="success" placeholder="Valid input" />
<Input disabled placeholder="Disabled" />`}
              id="input-states"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* With Prefix/Suffix */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Prefix & Suffix
            </h4>
            <div className="space-y-3">
              <Input
                type="number"
                placeholder="0.00"
                prefix={<span className="text-neutral-500">$</span>}
              />
              <Input
                type="text"
                placeholder="Enter percentage"
                suffix={<span className="text-neutral-500">%</span>}
              />
              <Input
                placeholder="With help text"
                helpText="Enter a value between 0 and 100"
              />
            </div>
            <CodeBlock
              code={`<Input
  type="number"
  prefix={<span className="text-neutral-500">$</span>}
  placeholder="0.00"
/>
<Input
  suffix={<span className="text-neutral-500">%</span>}
  placeholder="Percentage"
/>
<Input helpText="Helper text below input" />`}
              id="input-prefix-suffix"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Select Component */}
        <ComponentSection
          title="Select"
          description="Dropdown select component with validation states and sizes."
          id="select"
        >
          {/* Sizes */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Sizes
            </h4>
            <div className="space-y-3">
              <Select size="sm">
                <option value="">Small select</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </Select>
              <Select size="md">
                <option value="">Medium select (default)</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </Select>
              <Select size="lg">
                <option value="">Large select</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </Select>
            </div>
            <CodeBlock
              code={`<Select size="sm">
  <option value="">Choose...</option>
  <option value="1">Option 1</option>
</Select>`}
              id="select-sizes"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* States */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              States
            </h4>
            <div className="space-y-3">
              <Select>
                <option value="">Default state</option>
                <option value="1">Option 1</option>
              </Select>
              <Select state="error" error="Please select an option">
                <option value="">Error state</option>
                <option value="1">Option 1</option>
              </Select>
              <Select state="success">
                <option value="1">Success state</option>
                <option value="2">Option 2</option>
              </Select>
              <Select disabled>
                <option value="">Disabled state</option>
              </Select>
            </div>
            <CodeBlock
              code={`<Select state="error" error="Required field">
  <option value="">Choose...</option>
</Select>
<Select state="success">
  <option value="1">Valid selection</option>
</Select>`}
              id="select-states"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Spinner Component */}
        <ComponentSection
          title="Spinner"
          description="Loading indicator with multiple sizes and overlay variant."
          id="spinner"
        >
          {/* Sizes */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Sizes
            </h4>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <Spinner size="sm" />
                <p className="text-xs text-neutral-500 mt-2">Small</p>
              </div>
              <div className="text-center">
                <Spinner size="md" />
                <p className="text-xs text-neutral-500 mt-2">Medium</p>
              </div>
              <div className="text-center">
                <Spinner size="lg" />
                <p className="text-xs text-neutral-500 mt-2">Large</p>
              </div>
            </div>
            <CodeBlock
              code={`<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />`}
              id="spinner-sizes"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* Overlay */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Spinner Overlay
            </h4>
            <Button onClick={() => {
              setShowSpinnerOverlay(true)
              setTimeout(() => setShowSpinnerOverlay(false), 2000)
            }}>
              Show Spinner Overlay (2s)
            </Button>
            {showSpinnerOverlay && <SpinnerOverlay />}
            <CodeBlock
              code={`{isLoading && <SpinnerOverlay />}`}
              id="spinner-overlay"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Skeleton Component */}
        <ComponentSection
          title="Skeleton"
          description="Loading placeholders for content that is still loading."
          id="skeleton"
        >
          {/* Basic Skeleton */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Basic Skeleton
            </h4>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <CodeBlock
              code={`<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-4 w-1/2" />`}
              id="skeleton-basic"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>

          {/* Skeleton Variants */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
              Preset Variants
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonChart />
            </div>
            <div className="mt-4">
              <SkeletonTable rows={3} />
            </div>
            <CodeBlock
              code={`<SkeletonCard />
<SkeletonChart />
<SkeletonTable rows={5} />`}
              id="skeleton-variants"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Dialog Component */}
        <ComponentSection
          title="Dialog"
          description="Accessible modal dialog with backdrop and focus management."
          id="dialog"
        >
          <div>
            <Button onClick={() => setIsDialogOpen(true)}>Open Dialog</Button>
            <Dialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              title="Example Dialog"
              maxWidth="lg"
            >
              <p className="text-neutral-600">
                This is a dialog component with automatic focus management,
                keyboard navigation (ESC to close), and click-outside-to-close functionality.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  Confirm
                </Button>
              </div>
            </Dialog>
            <CodeBlock
              code={`const [isOpen, setIsOpen] = useState(false)

<Button onClick={() => setIsOpen(true)}>
  Open Dialog
</Button>

<Dialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Dialog Title"
  maxWidth="lg"
>
  <p>Dialog content goes here...</p>
  <div className="mt-4 flex justify-end gap-2">
    <Button onClick={() => setIsOpen(false)}>
      Close
    </Button>
  </div>
</Dialog>`}
              id="dialog-example"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Modal Component */}
        <ComponentSection
          title="Modal"
          description="Alternative modal component with description and multiple size options."
          id="modal"
        >
          <div>
            <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Example Modal"
              description="This is an optional description"
              size="lg"
            >
              <p className="text-neutral-600">
                Modal component with support for title, optional description,
                and configurable sizes (sm, md, lg, xl).
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsModalOpen(false)}>
                  Save Changes
                </Button>
              </div>
            </Modal>
            <CodeBlock
              code={`const [isOpen, setIsOpen] = useState(false)

<Button onClick={() => setIsOpen(true)}>
  Open Modal
</Button>

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Optional description"
  size="lg"
>
  <p>Modal content...</p>
</Modal>`}
              id="modal-example"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Empty State Component */}
        <ComponentSection
          title="Empty State"
          description="Display helpful messages when no data is available."
          id="empty-state"
        >
          <div className="space-y-8">
            {/* Basic Empty State */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
                Basic
              </h4>
              <div className="border border-neutral-200 rounded-lg">
                <EmptyState
                  title="No trades found"
                  description="You haven't created any trades yet. Get started by opening your first position."
                />
              </div>
              <CodeBlock
                code={`<EmptyState
  title="No trades found"
  description="You haven't created any trades yet."
/>`}
                id="empty-state-basic"
                copiedCode={copiedCode}
                onCopy={copyCode}
              />
            </div>

            {/* With Action */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
                With Action Button
              </h4>
              <div className="border border-neutral-200 rounded-lg">
                <EmptyState
                  title="No positions"
                  description="Start tracking your wheel strategy positions."
                  actionLabel="Create Position"
                  actionHref="#"
                />
              </div>
              <CodeBlock
                code={`<EmptyState
  title="No positions"
  description="Start tracking your positions."
  actionLabel="Create Position"
  actionHref="/positions/new"
/>`}
                id="empty-state-action"
                copiedCode={copiedCode}
                onCopy={copyCode}
              />
            </div>
          </div>
        </ComponentSection>

        {/* Error Message Component */}
        <ComponentSection
          title="Error Message"
          description="Display error messages with optional retry functionality."
          id="error-message"
        >
          <div className="space-y-4">
            <ErrorMessage
              title="Error"
              message="Something went wrong while loading your data."
            />
            <ErrorMessage
              title="Validation Error"
              message="Please check your input and try again."
              onRetry={() => alert('Retrying...')}
            />
            <CodeBlock
              code={`<ErrorMessage
  title="Error"
  message="Something went wrong."
/>

<ErrorMessage
  title="Network Error"
  message="Failed to connect to server."
  onRetry={() => handleRetry()}
/>`}
              id="error-message-example"
              copiedCode={copiedCode}
              onCopy={copyCode}
            />
          </div>
        </ComponentSection>

        {/* Help Icon Component */}
        <ComponentSection
          title="Help Icon"
          description="Contextual help tooltips and icons for user guidance."
          id="help-icon"
        >
          <div className="space-y-8">
            {/* Help Icon */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
                Help Icon
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-700">Strike Price</span>
                  <HelpIcon tooltip="The price at which the option can be exercised" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-700">Premium</span>
                  <HelpIcon
                    tooltip="Amount received for selling the option"
                    helpLink="#"
                  />
                </div>
              </div>
              <CodeBlock
                code={`<HelpIcon tooltip="Helpful information" />
<HelpIcon
  tooltip="More details"
  helpLink="/docs/help"
/>`}
                id="help-icon-example"
                copiedCode={copiedCode}
                onCopy={copyCode}
              />
            </div>

            {/* Help Tooltip */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
                Help Tooltip
              </h4>
              <div className="flex gap-4">
                <HelpTooltip content="Hover for help" position="top">
                  <span className="text-sm font-medium text-blue-600 border-b border-dashed border-blue-600 cursor-help">
                    Hover me (top)
                  </span>
                </HelpTooltip>
                <HelpTooltip content="Bottom tooltip" position="bottom">
                  <span className="text-sm font-medium text-blue-600 border-b border-dashed border-blue-600 cursor-help">
                    Hover me (bottom)
                  </span>
                </HelpTooltip>
              </div>
              <CodeBlock
                code={`<HelpTooltip content="Helpful info" position="top">
  <span>Hover me</span>
</HelpTooltip>`}
                id="help-tooltip-example"
                copiedCode={copiedCode}
                onCopy={copyCode}
              />
            </div>
          </div>
        </ComponentSection>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-neutral-600">
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
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">{title}</h2>
        <p className="text-neutral-600">{description}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
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
      <pre className="bg-neutral-900 text-neutral-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-2 right-2 bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-xs transition-colors"
      >
        {copiedCode === id ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  )
}
