/**
 * Credits system utilities for Soulmatch
 * Credits use Zeichen (Z) and Tokens (T), where 100Z = 1T
 * Audio costs 10x text
 */

/**
 * Credit tier types
 */
export type CreditTier = 'free' | 'starter' | 'premium';

/**
 * Credit usage information
 */
export interface CreditInfo {
    used: number;
    total: number;
}

/**
 * Constants for the credits system
 */
export const CREDITS_CONSTANTS = {
    /** Conversion rate: 100 Zeichen = 1 Token */
    ZEICHEN_PER_TOKEN: 100,
    
    /** Audio cost multiplier compared to text */
    AUDIO_COST_MULTIPLIER: 10,
    
    /** Credit tier thresholds */
    TIER_THRESHOLDS: {
        FREE: 100,
        STARTER: 400,
        PREMIUM: 1000
    },
    
    /** Warning threshold percentage */
    WARNING_THRESHOLD_PERCENT: 20,
    
    /** Color thresholds */
    COLOR_THRESHOLDS: {
        GREEN: 50,  // >50% remaining
        YELLOW: 20  // 20-50% remaining
    }
} as const;

/**
 * Format credits display with used/total tokens
 * Shows warning emoji when less than 20% remaining
 * 
 * @param used - Number of tokens used
 * @param total - Total number of tokens available
 * @returns Formatted string showing used/total tokens
 */
export function formatCreditsDisplay(used: number, total: number): string {
    const remainingPercent = ((total - used) / total) * 100;
    const warningEmoji = remainingPercent < CREDITS_CONSTANTS.WARNING_THRESHOLD_PERCENT ? ' ⚠️' : '';
    return `${used}/${total}T${warningEmoji}`;
}

/**
 * Estimate cost in tokens based on response count and audio mode
 * 
 * @param responseCount - Number of responses to estimate
 * @param audioMode - Whether audio mode is enabled (costs 10x)
 * @returns Estimated tokens used
 */
export function estimateCost(responseCount: number, audioMode: boolean): number {
    const baseCost = responseCount;
    return audioMode ? baseCost * CREDITS_CONSTANTS.AUDIO_COST_MULTIPLIER : baseCost;
}

/**
 * Get color based on credit usage percentage
 * Green when >50% remaining, yellow when 20-50% remaining, red when <20% remaining
 * 
 * @param used - Number of tokens used
 * @param total - Total number of tokens available
 * @returns Hex color code
 */
export function getCreditsColor(used: number, total: number): string {
    const remainingPercent = ((total - used) / total) * 100;
    
    if (remainingPercent > CREDITS_CONSTANTS.COLOR_THRESHOLDS.GREEN) {
        return '#10B981'; // Green
    } else if (remainingPercent >= CREDITS_CONSTANTS.COLOR_THRESHOLDS.YELLOW) {
        return '#F59E0B'; // Yellow
    } else {
        return '#EF4444'; // Red
    }
}

/**
 * Determine credit tier based on total tokens
 * 
 * @param total - Total number of tokens available
 * @returns Credit tier name
 */
export function getCreditsTier(total: number): CreditTier {
    if (total >= CREDITS_CONSTANTS.TIER_THRESHOLDS.PREMIUM) {
        return 'premium';
    } else if (total >= CREDITS_CONSTANTS.TIER_THRESHOLDS.STARTER) {
        return 'starter';
    } else {
        return 'free';
    }
}
