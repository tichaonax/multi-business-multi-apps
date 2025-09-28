/**
 * Advanced Conflict Resolution System
 * Implements multiple strategies for resolving sync conflicts with business logic
 */

import { PrismaClient, ConflictType, ResolutionStrategy } from '@prisma/client'
import { ChangeEvent, VectorClock } from './change-tracker'
import crypto from 'crypto'

export interface ConflictResolutionRule {
  tableName: string
  strategy: ResolutionStrategy
  priority: number
  customResolver?: (events: ChangeEvent[]) => Promise<ConflictResolutionResult>
  businessRules?: BusinessRule[]
}

export interface BusinessRule {
  field: string
  condition: 'always_keep' | 'prefer_newer' | 'prefer_higher' | 'merge_arrays' | 'custom'
  weight: number
  customMerge?: (oldValue: any, newValue: any) => any
}

export interface ConflictResolutionResult {
  winningEvent: ChangeEvent
  losingEvents: ChangeEvent[]
  strategy: ResolutionStrategy
  mergedData?: any
  requiresHumanReview: boolean
  confidence: number // 0-100
  resolutionNotes: string[]
}

export interface NodePriorityConfig {
  nodeId: string
  priority: number // 1-10, higher wins
  specializations: string[] // Tables this node has authority over
}

/**
 * Advanced Conflict Resolution Engine
 */
export class ConflictResolver {
  private prisma: PrismaClient
  private nodeId: string
  private nodePriority: number
  private resolutionRules = new Map<string, ConflictResolutionRule>()
  private nodePriorities = new Map<string, NodePriorityConfig>()

  constructor(prisma: PrismaClient, nodeId: string, nodePriority: number = 5) {
    this.prisma = prisma
    this.nodeId = nodeId
    this.nodePriority = nodePriority

    this.initializeDefaultRules()
  }

  /**
   * Resolve conflicts between multiple events
   */
  async resolveConflict(
    conflictingEvents: ChangeEvent[],
    conflictType: ConflictType
  ): Promise<ConflictResolutionResult> {

    if (conflictingEvents.length < 2) {
      throw new Error('Need at least 2 events to resolve conflict')
    }

    const tableName = conflictingEvents[0].tableName
    const rule = this.resolutionRules.get(tableName) || this.getDefaultRule(tableName)

    try {
      let result: ConflictResolutionResult

      // Use custom resolver if available
      if (rule.customResolver) {
        result = await rule.customResolver(conflictingEvents)
      } else {
        // Use standard resolution strategy
        result = await this.resolveByStrategy(conflictingEvents, rule.strategy, conflictType)
      }

      // Record the resolution
      await this.recordResolution(result, conflictType, tableName)

      return result
    } catch (error) {
      console.error('Conflict resolution failed:', error)

      // Fallback to last writer wins
      return this.resolveByLastWriterWins(conflictingEvents)
    }
  }

  /**
   * Resolve conflict using specific strategy
   */
  private async resolveByStrategy(
    events: ChangeEvent[],
    strategy: ResolutionStrategy,
    conflictType: ConflictType
  ): Promise<ConflictResolutionResult> {

    switch (strategy) {
      case 'LAST_WRITER_WINS':
        return this.resolveByLastWriterWins(events)

      case 'NODE_PRIORITY':
        return this.resolveByNodePriority(events)

      case 'MERGE_CHANGES':
        return this.resolveByMerging(events)

      case 'BUSINESS_RULE':
        return this.resolveByBusinessRules(events)

      case 'KEEP_BOTH':
        return this.resolveByKeepingBoth(events)

      case 'MANUAL_RESOLUTION':
        return this.requireManualResolution(events)

      default:
        return this.resolveByLastWriterWins(events)
    }
  }

  /**
   * Last Writer Wins - Timestamp based resolution
   */
  private async resolveByLastWriterWins(events: ChangeEvent[]): Promise<ConflictResolutionResult> {
    // Sort by Lamport clock (logical time), then by node priority as tiebreaker
    const sortedEvents = events.sort((a, b) => {
      const timeDiff = Number(BigInt(b.lamportClock) - BigInt(a.lamportClock))
      if (timeDiff !== 0) return timeDiff

      // Tiebreaker: use node priority
      const priorityA = this.getNodePriority(a.sourceNodeId)
      const priorityB = this.getNodePriority(b.sourceNodeId)
      return priorityB - priorityA
    })

    const winningEvent = sortedEvents[0]
    const losingEvents = sortedEvents.slice(1)

    return {
      winningEvent,
      losingEvents,
      strategy: 'LAST_WRITER_WINS',
      requiresHumanReview: false,
      confidence: 85,
      resolutionNotes: [
        `Selected event with latest timestamp: ${winningEvent.lamportClock}`,
        `From node: ${winningEvent.sourceNodeId}`
      ]
    }
  }

  /**
   * Node Priority Based Resolution
   */
  private async resolveByNodePriority(events: ChangeEvent[]): Promise<ConflictResolutionResult> {
    // Sort by node priority, then by timestamp
    const sortedEvents = events.sort((a, b) => {
      const priorityA = this.getNodePriority(a.sourceNodeId)
      const priorityB = this.getNodePriority(b.sourceNodeId)

      if (priorityA !== priorityB) {
        return priorityB - priorityA // Higher priority wins
      }

      // Same priority, use timestamp
      return Number(BigInt(b.lamportClock) - BigInt(a.lamportClock))
    })

    const winningEvent = sortedEvents[0]
    const losingEvents = sortedEvents.slice(1)
    const winningPriority = this.getNodePriority(winningEvent.sourceNodeId)

    return {
      winningEvent,
      losingEvents,
      strategy: 'NODE_PRIORITY',
      requiresHumanReview: false,
      confidence: 90,
      resolutionNotes: [
        `Selected event from highest priority node: ${winningEvent.sourceNodeId} (priority: ${winningPriority})`,
        `Timestamp: ${winningEvent.lamportClock}`
      ]
    }
  }

  /**
   * Merge Changes - Intelligent field-level merging
   */
  private async resolveByMerging(events: ChangeEvent[]): Promise<ConflictResolutionResult> {
    if (events.length !== 2) {
      // Fall back to last writer wins for complex merges
      return this.resolveByLastWriterWins(events)
    }

    const [eventA, eventB] = events.sort((a, b) => Number(BigInt(a.lamportClock) - BigInt(b.lamportClock)))
    const tableName = eventA.tableName
    const rule = this.resolutionRules.get(tableName)

    try {
      let mergedData = { ...eventA.changeData }
      const resolutionNotes: string[] = []
      let confidence = 70

      // Apply business rules for field-level merging
      if (rule?.businessRules) {
        for (const businessRule of rule.businessRules) {
          const field = businessRule.field
          const oldValue = eventA.changeData[field]
          const newValue = eventB.changeData[field]

          if (oldValue !== newValue) {
            const mergedValue = this.mergeFieldValue(oldValue, newValue, businessRule)
            mergedData[field] = mergedValue
            confidence += businessRule.weight
            resolutionNotes.push(`Merged field '${field}' using ${businessRule.condition}`)
          }
        }
      } else {
        // Default merge strategy: take non-null values from newer event
        for (const [field, newValue] of Object.entries(eventB.changeData)) {
          if (newValue !== null && newValue !== undefined && newValue !== '') {
            if (mergedData[field] !== newValue) {
              mergedData[field] = newValue
              resolutionNotes.push(`Updated field '${field}' with newer value`)
            }
          }
        }
      }

      // Create synthetic winning event with merged data
      const winningEvent: ChangeEvent = {
        ...eventB, // Use newer event as base
        changeData: mergedData,
        checksum: this.calculateChecksum(mergedData)
      }

      return {
        winningEvent,
        losingEvents: events,
        strategy: 'MERGE_CHANGES',
        mergedData,
        requiresHumanReview: confidence < 80,
        confidence: Math.min(confidence, 95),
        resolutionNotes
      }
    } catch (error) {
      console.error('Merge failed, falling back to last writer wins:', error)
      return this.resolveByLastWriterWins(events)
    }
  }

  /**
   * Business Rule Based Resolution
   */
  private async resolveByBusinessRules(events: ChangeEvent[]): Promise<ConflictResolutionResult> {
    const tableName = events[0].tableName
    const rule = this.resolutionRules.get(tableName)

    if (!rule?.businessRules) {
      return this.resolveByLastWriterWins(events)
    }

    // Score each event based on business rules
    const scoredEvents = events.map(event => {
      let score = 0
      const reasons: string[] = []

      for (const businessRule of rule.businessRules) {
        const fieldValue = event.changeData[businessRule.field]

        switch (businessRule.condition) {
          case 'always_keep':
            if (fieldValue !== null && fieldValue !== undefined) {
              score += businessRule.weight
              reasons.push(`Has required field: ${businessRule.field}`)
            }
            break

          case 'prefer_newer':
            // Already handled by timestamp comparison
            break

          case 'prefer_higher':
            if (typeof fieldValue === 'number' && fieldValue > 0) {
              score += businessRule.weight * (fieldValue / 100)
              reasons.push(`Higher value in ${businessRule.field}: ${fieldValue}`)
            }
            break
        }
      }

      return { event, score, reasons }
    })

    // Sort by score, then by timestamp
    scoredEvents.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }
      return Number(BigInt(b.event.lamportClock) - BigInt(a.event.lamportClock))
    })

    const winner = scoredEvents[0]
    const losers = scoredEvents.slice(1).map(s => s.event)

    return {
      winningEvent: winner.event,
      losingEvents: losers,
      strategy: 'BUSINESS_RULE',
      requiresHumanReview: winner.score < 50,
      confidence: Math.min(winner.score, 95),
      resolutionNotes: [
        `Selected event with highest business rule score: ${winner.score}`,
        ...winner.reasons
      ]
    }
  }

  /**
   * Keep Both - Create separate records
   */
  private async resolveByKeepingBoth(events: ChangeEvent[]): Promise<ConflictResolutionResult> {
    // For now, just pick the first event but mark for human review
    const winningEvent = events[0]
    const losingEvents = events.slice(1)

    return {
      winningEvent,
      losingEvents,
      strategy: 'KEEP_BOTH',
      requiresHumanReview: true,
      confidence: 50,
      resolutionNotes: [
        'Multiple valid versions detected',
        'Requires manual review to determine if both should be kept'
      ]
    }
  }

  /**
   * Require Manual Resolution
   */
  private requireManualResolution(events: ChangeEvent[]): ConflictResolutionResult {
    return {
      winningEvent: events[0], // Temporary winner
      losingEvents: events.slice(1),
      strategy: 'MANUAL_RESOLUTION',
      requiresHumanReview: true,
      confidence: 0,
      resolutionNotes: [
        'Conflict requires manual human intervention',
        'No automatic resolution strategy available'
      ]
    }
  }

  /**
   * Merge field value based on business rule
   */
  private mergeFieldValue(oldValue: any, newValue: any, rule: BusinessRule): any {
    switch (rule.condition) {
      case 'always_keep':
        return oldValue !== null ? oldValue : newValue

      case 'prefer_newer':
        return newValue

      case 'prefer_higher':
        if (typeof oldValue === 'number' && typeof newValue === 'number') {
          return Math.max(oldValue, newValue)
        }
        return newValue

      case 'merge_arrays':
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
          return [...new Set([...oldValue, ...newValue])]
        }
        return newValue

      case 'custom':
        return rule.customMerge ? rule.customMerge(oldValue, newValue) : newValue

      default:
        return newValue
    }
  }

  /**
   * Get node priority
   */
  private getNodePriority(nodeId: string): number {
    const config = this.nodePriorities.get(nodeId)
    return config?.priority || 5 // Default priority
  }

  /**
   * Calculate data checksum
   */
  private calculateChecksum(data: any): string {
    const crypto = require('crypto')
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Record conflict resolution in database
   */
  private async recordResolution(
    result: ConflictResolutionResult,
    conflictType: ConflictType,
    tableName: string
  ): Promise<void> {
    try {
      await this.prisma.conflict_resolutions.create({
        data: {
          id: crypto.randomUUID(),
          conflictType,
          resolutionStrategy: result.strategy,
          sourceEventId: result.winningEvent.eventId,
          targetEventId: result.losingEvents[0]?.eventId,
          resolvedData: result.mergedData || result.winningEvent.changeData,
          resolvedBy: this.nodeId,
          eventIds: result.losingEvents.map(e => e.eventId),
          metadata: {
            tableName,
            recordId: result.winningEvent.recordId,
            confidence: result.confidence,
            resolutionNotes: result.resolutionNotes,
            autoResolved: !result.requiresHumanReview,
            humanReviewed: false
          }
        }
      })
    } catch (error) {
      console.error('Failed to record conflict resolution:', error)
    }
  }

  /**
   * Initialize default resolution rules
   */
  private initializeDefaultRules(): void {
    // Critical business data - use node priority
    this.addResolutionRule('users', {
      tableName: 'users',
      strategy: 'NODE_PRIORITY',
      priority: 10,
      businessRules: [
        { field: 'email', condition: 'always_keep', weight: 20 },
        { field: 'isActive', condition: 'prefer_newer', weight: 15 }
      ]
    })

    // Business orders - merge when possible
    this.addResolutionRule('business_orders', {
      tableName: 'business_orders',
      strategy: 'MERGE_CHANGES',
      priority: 9,
      businessRules: [
        { field: 'totalAmount', condition: 'prefer_higher', weight: 25 },
        { field: 'status', condition: 'prefer_newer', weight: 20 },
        { field: 'notes', condition: 'merge_arrays', weight: 10 }
      ]
    })

    // Employee data - use business rules
    this.addResolutionRule('employees', {
      tableName: 'employees',
      strategy: 'BUSINESS_RULE',
      priority: 8,
      businessRules: [
        { field: 'isActive', condition: 'always_keep', weight: 30 },
        { field: 'salary', condition: 'prefer_higher', weight: 25 },
        { field: 'jobTitle', condition: 'prefer_newer', weight: 15 }
      ]
    })

    // Product inventory - last writer wins
    this.addResolutionRule('business_products', {
      tableName: 'business_products',
      strategy: 'LAST_WRITER_WINS',
      priority: 7
    })

    // Audit logs - keep both
    this.addResolutionRule('audit_logs', {
      tableName: 'audit_logs',
      strategy: 'KEEP_BOTH',
      priority: 6
    })
  }

  /**
   * Add custom resolution rule
   */
  addResolutionRule(tableName: string, rule: ConflictResolutionRule): void {
    this.resolutionRules.set(tableName, rule)
  }

  /**
   * Set node priority configuration
   */
  setNodePriority(nodeId: string, config: NodePriorityConfig): void {
    this.nodePriorities.set(nodeId, config)
  }

  /**
   * Get default rule for table
   */
  private getDefaultRule(tableName: string): ConflictResolutionRule {
    return {
      tableName,
      strategy: 'LAST_WRITER_WINS',
      priority: 5
    }
  }

  /**
   * Load node priorities from database
   */
  async loadNodePriorities(): Promise<void> {
    try {
      const nodes = await this.prisma.sync_nodes.findMany({
        where: { isActive: true },
        select: {
          nodeId: true,
          capabilities: true
        }
      })

      for (const node of nodes) {
        const capabilities = node.capabilities as any
        const priority = capabilities?.priority || 5
        const specializations = capabilities?.specializations || []

        this.setNodePriority(node.nodeId, {
          nodeId: node.nodeId,
          priority,
          specializations
        })
      }
    } catch (error) {
      console.warn('Failed to load node priorities:', error)
    }
  }
}