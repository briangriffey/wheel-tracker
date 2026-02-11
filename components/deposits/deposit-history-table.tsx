'use client'

import React, { useState, useMemo } from 'react'
import type { CashDepositData } from '@/lib/actions/deposits'

interface DepositHistoryTableProps {
  initialDeposits: CashDepositData[]
}

type SortField = 'depositDate' | 'amount' | 'type' | 'spyPrice'
type SortDirection = 'asc' | 'desc'
type DepositTypeFilter = 'ALL' | 'DEPOSIT' | 'WITHDRAWAL'

export function DepositHistoryTable({ initialDeposits }: DepositHistoryTableProps) {
  const [deposits, setDeposits] = useState<CashDepositData[]>(initialDeposits)
  const [typeFilter, setTypeFilter] = useState<DepositTypeFilter>('ALL')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [sortField, setSortField] = useState<SortField>('depositDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Sync state with props
  React.useEffect(() => {
    setDeposits(initialDeposits)
  }, [initialDeposits])

  // Filter and sort deposits
  const filteredDeposits = useMemo(() => {
    let filtered = [...deposits]

    // Apply type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((deposit) => deposit.type === typeFilter)
    }

    // Apply date range filters
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart)
      filtered = filtered.filter((deposit) => new Date(deposit.depositDate) >= startDate)
    }

    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd)
      filtered = filtered.filter((deposit) => new Date(deposit.depositDate) <= endDate)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortField) {
        case 'amount':
          aValue = Math.abs(a.amount)
          bValue = Math.abs(b.amount)
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'spyPrice':
          aValue = a.spyPrice
          bValue = b.spyPrice
          break
        case 'depositDate':
        default:
          aValue = new Date(a.depositDate)
          bValue = new Date(b.depositDate)
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [deposits, typeFilter, dateRangeStart, dateRangeEnd, sortField, sortDirection])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value))
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Format shares
  const formatShares = (shares: number) => {
    return Math.abs(shares).toFixed(4)
  }

  // Get type badge styles
  const getTypeBadgeStyles = (type: 'DEPOSIT' | 'WITHDRAWAL') => {
    return type === 'DEPOSIT'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="w-full">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type Filter */}
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DepositTypeFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposits Only</option>
              <option value="WITHDRAWAL">Withdrawals Only</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label htmlFor="date-start" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="date-start"
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label htmlFor="date-end" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="date-end"
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredDeposits.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No deposits found matching your filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('depositDate')}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        {getSortIcon('depositDate')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        {getSortIcon('type')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-2">
                        Amount
                        {getSortIcon('amount')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('spyPrice')}
                    >
                      <div className="flex items-center gap-2">
                        SPY Price
                        {getSortIcon('spyPrice')}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SPY Shares
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDeposits.map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(deposit.depositDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${getTypeBadgeStyles(deposit.type)}`}>
                          {deposit.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(deposit.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(deposit.spyPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatShares(deposit.spyShares)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {deposit.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {filteredDeposits.map((deposit) => (
                <div key={deposit.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(deposit.depositDate)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatShares(deposit.spyShares)} SPY @ {formatCurrency(deposit.spyPrice)}
                      </div>
                    </div>
                    <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${getTypeBadgeStyles(deposit.type)}`}>
                      {deposit.type}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mb-1">
                    {formatCurrency(deposit.amount)}
                  </div>
                  {deposit.notes && (
                    <div className="text-sm text-gray-500 mt-2">
                      {deposit.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Results count */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {filteredDeposits.length} of {deposits.length} transaction{deposits.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
