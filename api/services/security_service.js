import { hashString } from './utils.js';

/**
 * SecurityService: Implements Model Armor and Response Scrubbing patterns 
 * for secure agent development in ADK.
 */
export class SecurityService {
    constructor() {
        this.dangerPatterns = [
            /\brm\s+-rf\b/i, /\bsudo\b/i, /\bchmod\b/i, /\bchown\b/i,
            /\bsh\b\s+/, /\bbash\b\s+/, /\bpython\b\s+/, /\bnode\b\s+/,
            /\bcurl\b/i, /\bwget\b/i, /\bssh\b/i, /\bkill\b -9/i,
            /\/> / , /@shell/, /@terminal/, /@system/
        ];

        this.piiPatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
            /\b(?:\d[ -]*?){13,16}\b/ // Credit Card (fuzzy)
        ];

        // Model Armor Audit Log
        this.auditLog = [];
    }

    /**
     * Intercepts and validates user prompts or system context before 
     * it is sent to the Large Language Model.
     * @returns {boolean} - True if safe, false if blocked.
     */
    validatePrompt(text) {
        const input = String(text || '').toLowerCase();
        
        for (const pattern of this.dangerPatterns) {
            if (pattern.test(input)) {
                this.logSecurityEvent('PROMPT_INJECTION_BLOCKED', { pattern: pattern.toString(), snippet: input.substring(0, 100) });
                return false;
            }
        }
        return true;
    }

    /**
     * Scrubs Model responses before they are presented to the user 
     * or executed as tool calls.
     * @returns {string} - The cleaned text.
     */
    scrubResponse(text) {
        let output = String(text || '');
        
        // 1. Scrub PII (Replace with [REDACTED])
        for (const pattern of this.piiPatterns) {
            output = output.replace(pattern, '[REDACTED]');
        }

        // 2. Block Hallucinated Commands
        for (const pattern of this.dangerPatterns) {
            if (pattern.test(output)) {
                this.logSecurityEvent('RESPONSE_COMMAND_STRIPPED', { pattern: pattern.toString() });
                output = output.replace(pattern, '[BLOCKED COMMAND]');
            }
        }

        return output;
    }

    logSecurityEvent(type, details) {
        const event = {
            timestamp: new Date().toISOString(),
            type,
            ...details
        };
        this.auditLog.push(event);
        console.warn(`🛡️ [MODEL-ARMOR] ${type}:`, details);
        
        // Keep logs manageable
        if (this.auditLog.length > 100) this.auditLog.shift();
    }

    getAuditStats() {
        return {
            totalEvents: this.auditLog.length,
            lastEvent: this.auditLog[this.auditLog.length - 1]
        };
    }
}
