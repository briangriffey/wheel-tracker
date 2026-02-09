/**
 * Wheel Strategy Type Definitions
 *
 * Types for tracking the wheel options strategy lifecycle.
 */

/**
 * Wheel cycle steps
 *
 * Represents the current position in a wheel cycle:
 * - IDLE: No active cycle, waiting for new PUT
 * - PUT: PUT option sold, waiting for assignment or expiration
 * - HOLDING: Shares acquired via PUT assignment, waiting for CALL
 * - COVERED: Covered CALL sold against position, waiting for assignment or expiration
 */
export enum WheelStep {
  IDLE = 'IDLE',
  PUT = 'PUT',
  HOLDING = 'HOLDING',
  COVERED = 'COVERED',
}

/**
 * Wheel status types
 */
export enum WheelStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

/**
 * Wheel lifecycle state machine
 *
 * Defines valid transitions between wheel steps:
 * - IDLE → PUT: When PUT is created
 * - PUT → HOLDING: When PUT is assigned
 * - PUT → IDLE: When PUT expires/closes without assignment
 * - HOLDING → COVERED: When CALL is created
 * - COVERED → IDLE: When CALL is assigned (cycle completes)
 * - COVERED → HOLDING: When CALL expires/closes without assignment
 */
export const WHEEL_STEP_TRANSITIONS: Record<WheelStep, WheelStep[]> = {
  [WheelStep.IDLE]: [WheelStep.PUT],
  [WheelStep.PUT]: [WheelStep.HOLDING, WheelStep.IDLE],
  [WheelStep.HOLDING]: [WheelStep.COVERED],
  [WheelStep.COVERED]: [WheelStep.IDLE, WheelStep.HOLDING],
}

/**
 * Validate if a wheel step transition is allowed
 *
 * @param from - Current wheel step
 * @param to - Target wheel step
 * @returns True if transition is valid
 */
export function isValidWheelStepTransition(from: WheelStep, to: WheelStep): boolean {
  return WHEEL_STEP_TRANSITIONS[from].includes(to)
}
