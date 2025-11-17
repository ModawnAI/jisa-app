'use client'

/**
 * Individual Document Classification Edit Page
 *
 * Manual classification interface for single documents with full control
 * over all classification dimensions.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

interface Document {
  id: string
  content: string
  metadata?: any
  sensitivity_level?: string
  content_category?: string[]
  target_departments?: string[]
  target_roles?: string[]
  target_tiers?: string[]
  target_positions?: string[]
  geographic_restrictions?: string[]
  time_restrictions?: {
    start_date?: string
    end_date?: string
    days_of_week?: number[]
    hours_of_day?: number[]
  }
  classification_confidence?: number
  classification_method?: string
  created_at?: string
}

const SENSITIVITY_LEVELS = ['public', 'internal', 'confidential', 'secret']
const CATEGORIES = [
  'training',
  'compliance',
  'product_info',
  'customer_support',
  'hr_policy',
  'technical_docs',
  'marketing',
  'sales',
  'operations',
  'finance',
]
const ROLES = ['user', 'junior', 'senior', 'manager', 'admin', 'ceo']
const TIERS = ['free', 'basic', 'pro', 'enterprise']
const DEPARTMENTS = [
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'HR',
  'IT',
  'Customer Service',
  'Engineering',
  'Legal',
]
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function DocumentClassificationEditPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Classification form state
  const [sensitivityLevel, setSensitivityLevel] = useState<string>('internal')
  const [contentCategories, setContentCategories] = useState<string[]>([])
  const [targetDepartments, setTargetDepartments] = useState<string[]>([])
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [targetTiers, setTargetTiers] = useState<string[]>([])
  const [targetPositions, setTargetPositions] = useState<string>('')
  const [geoRestrictions, setGeoRestrictions] = useState<string>('')

  // Time restrictions
  const [enableTimeRestrictions, setEnableTimeRestrictions] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startHour, setStartHour] = useState<number>(9)
  const [endHour, setEndHour] = useState<number>(18)

  useEffect(() => {
    fetchDocument()
  }, [documentId])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/data/documents/${documentId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch document')
      }

      const data = await response.json()
      const doc = data.document

      setDocument(doc)

      // Populate form with existing classification
      if (doc.sensitivity_level) setSensitivityLevel(doc.sensitivity_level)
      if (doc.content_category) setContentCategories(doc.content_category)
      if (doc.target_departments) setTargetDepartments(doc.target_departments)
      if (doc.target_roles) setTargetRoles(doc.target_roles)
      if (doc.target_tiers) setTargetTiers(doc.target_tiers)
      if (doc.target_positions) setTargetPositions(doc.target_positions.join(', '))
      if (doc.geographic_restrictions)
        setGeoRestrictions(doc.geographic_restrictions.join(', '))

      if (doc.time_restrictions) {
        setEnableTimeRestrictions(true)
        if (doc.time_restrictions.start_date)
          setStartDate(doc.time_restrictions.start_date.split('T')[0])
        if (doc.time_restrictions.end_date)
          setEndDate(doc.time_restrictions.end_date.split('T')[0])
        if (doc.time_restrictions.days_of_week)
          setSelectedDays(doc.time_restrictions.days_of_week)
        if (doc.time_restrictions.hours_of_day && doc.time_restrictions.hours_of_day.length >= 2) {
          setStartHour(doc.time_restrictions.hours_of_day[0])
          setEndHour(
            doc.time_restrictions.hours_of_day[doc.time_restrictions.hours_of_day.length - 1]
          )
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleArray = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter((item) => item !== value))
    } else {
      setArray([...array, value])
    }
  }

  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day))
    } else {
      setSelectedDays([...selectedDays, day].sort())
    }
  }

  const handleSave = async () => {
    if (!document) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Build time restrictions
      let timeRestrictions = undefined
      if (enableTimeRestrictions) {
        const hoursOfDay: number[] = []
        for (let h = startHour; h <= endHour; h++) {
          hoursOfDay.push(h)
        }

        timeRestrictions = {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          days_of_week: selectedDays.length > 0 ? selectedDays : undefined,
          hours_of_day: hoursOfDay.length > 0 ? hoursOfDay : undefined,
        }
      }

      const response = await fetch('/api/admin/classification/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: documentId,
          content_type: 'document',
          sensitivity_level: sensitivityLevel,
          content_category: contentCategories.length > 0 ? contentCategories : undefined,
          target_departments: targetDepartments.length > 0 ? targetDepartments : undefined,
          target_roles: targetRoles.length > 0 ? targetRoles : undefined,
          target_tiers: targetTiers.length > 0 ? targetTiers : undefined,
          target_positions:
            targetPositions.trim()
              ? targetPositions.split(',').map((p) => p.trim()).filter(Boolean)
              : undefined,
          geographic_restrictions:
            geoRestrictions.trim()
              ? geoRestrictions.split(',').map((g) => g.trim()).filter(Boolean)
              : undefined,
          time_restrictions: timeRestrictions,
          classification_method: 'manual',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save classification')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/classification')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">문서를 불러오는 중...</div>
      </DashboardLayout>
    )
  }

  if (!document) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-red-600">문서를 찾을 수 없습니다</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">문서 분류 수정</h1>
          <p className="text-gray-600">
            Manually configure classification dimensions for content access control
          </p>
        </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          Classification saved successfully! Redirecting...
        </div>
      )}

      {/* Document Preview */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">문서 미리보기</h2>
        <div className="bg-white rounded border p-4">
          <p className="text-sm text-gray-700 line-clamp-3">{document.content}</p>
        </div>
        {document.classification_method && (
          <div className="mt-3 text-sm text-gray-600">
            Current: {document.classification_method} classification (
            {document.classification_confidence
              ? `${Math.round(document.classification_confidence * 100)}% confidence`
              : 'no confidence score'}
            )
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Sensitivity Level */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Sensitivity Level *</h3>
          <div className="grid grid-cols-4 gap-4">
            {SENSITIVITY_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setSensitivityLevel(level)}
                className={`px-4 py-3 rounded-lg border-2 transition capitalize ${
                  sensitivityLevel === level
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Content Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Content Categories</h3>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map((category) => (
              <label key={category} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contentCategories.includes(category)}
                  onChange={() =>
                    handleToggleArray(contentCategories, setContentCategories, category)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Target Departments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Target Departments</h3>
          <div className="grid grid-cols-3 gap-3">
            {DEPARTMENTS.map((dept) => (
              <label key={dept} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={targetDepartments.includes(dept)}
                  onChange={() => handleToggleArray(targetDepartments, setTargetDepartments, dept)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{dept}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Target Roles */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Target Roles</h3>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map((role) => (
              <label key={role} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={targetRoles.includes(role)}
                  onChange={() => handleToggleArray(targetRoles, setTargetRoles, role)}
                  className="w-4 h-4"
                />
                <span className="text-sm capitalize">{role}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Target Tiers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Target Tiers</h3>
          <div className="grid grid-cols-4 gap-3">
            {TIERS.map((tier) => (
              <label key={tier} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={targetTiers.includes(tier)}
                  onChange={() => handleToggleArray(targetTiers, setTargetTiers, tier)}
                  className="w-4 h-4"
                />
                <span className="text-sm capitalize">{tier}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Target Positions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Target Positions</h3>
          <input
            type="text"
            value={targetPositions}
            onChange={(e) => setTargetPositions(e.target.value)}
            placeholder="e.g., Sales Manager, Senior Engineer (comma-separated)"
            className="w-full px-4 py-2 border rounded"
          />
          <p className="text-xs text-gray-500 mt-2">Comma-separated list of position names</p>
        </div>

        {/* Geographic Restrictions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Geographic Restrictions</h3>
          <input
            type="text"
            value={geoRestrictions}
            onChange={(e) => setGeoRestrictions(e.target.value)}
            placeholder="e.g., Seoul, Busan, US, EU (comma-separated)"
            className="w-full px-4 py-2 border rounded"
          />
          <p className="text-xs text-gray-500 mt-2">Leave empty for no restrictions</p>
        </div>

        {/* Time Restrictions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Time Restrictions</h3>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableTimeRestrictions}
                onChange={(e) => setEnableTimeRestrictions(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          {enableTimeRestrictions && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => handleToggleDay(day.value)}
                      className={`px-3 py-2 rounded text-sm ${
                        selectedDays.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours of Day (24-hour format)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Start Hour</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={startHour}
                      onChange={(e) => setStartHour(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">End Hour</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={endHour}
                      onChange={(e) => setEndHour(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available from {startHour}:00 to {endHour}:00
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border rounded hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Classification'}
          </button>
        </div>
      </div>
      </div>
    </DashboardLayout>
  )
}
