# Skill: Nexus Strategic Bridge 🛰️

Procedural knowledge for maintaining, debugging, and extending the **Nexus Comm-Link** neural bridge.

## When to use this skill
- When managing the Nexus Multimodal Live bridge.
- When debugging CDP (Chrome DevTools Protocol) connection issues.
- When extending the "Action Relay" system.
- When maintaining the premium "Glassmorphism" UI standards.

## Core Instructions

### 1. The "Wireless Viewport" Protocol
Nexus is a **viewport**, not a replacement. 
- **Rule**: Prioritize stability over precision. Use fuzzy matching for DOM elements.
- **Rule**: Never interfere with the Desktop's focus or scroll position.

### 2. CDP Connection Hygiene
The bridge lives or dies by the CDP link on Ports 9222 or 9000.
- **Priority**: Always seek `workbench.html` or titles matching "nexus_comm_link".
- **Recovery**: If the port is occupied by a non-IDE process, force-restart using `launch_nexus.command`.

### 3. Premium Aesthetics (Glassmorphism)
Designs must feel like a "Command Deck."
- **Colors**: Deep slates (`#0a0a0c`), vibrant accents (Gemini Blues), and high-transparency glass layers.
- **Animation**: Use subtle micro-animations (e.g., the 5s snapshot heartbeat) to show the bridge is "alive."

### 4. Neural Relay Security
The bridge is a secure tunnel into a private workspace.
- **Constraint**: Never expose `APP_PASSWORD` or `NGROK_AUTHTOKEN` in public logs.
- **Constraint**: Persistent settings must live in `.env` and be loaded with `override: true`.

## Troubleshooting Procedure
1. **ERR_NGROK_3200**: Restart the background Node server (it's a TTY/EIO error).
2. **1008 Policy Violation**: Check the API key rotation status in AI Studio.
3. **CDP Disconnect**: Fully quit Antigravity and rerun the `.command` script.
