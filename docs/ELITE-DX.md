# Elite-DX Standards: Terminal & Logging

To maintain a **premium developer experience (DX)**, all Nexus modules must adhere to the **Elite-DX** logging standards. The goal is a "Zero-Spam, High-Signal" terminal that feels professional and calm, even during complex background operations.

## 1. The "Silent Polling" Rule
Any process that runs on a frequent interval (e.g., CDP discovery, snapshot polling, port scanning) **must not log to stdout/stderr** during its normal operation.
- **BAD**: `[15:01:02] Checking for CDP...`
- **BAD**: `[15:01:03] Checking for CDP...`
- **GOOD**: (Silence) ... `✅ Connection Established`

## 2. Throttled Error Reporting
Repetitive background errors (e.g., "CDP not found") must be throttled. They should not flood the terminal.
- **Standard Pulse**: 30 seconds.
- **Implementation**: Track `lastErrorLog` timestamp and only allow `console.warn` if `now - lastErrorLog > 30000`.

## 3. No Binary/Stream Spam
Real-time data relay (audio chunks, video frames, large base64 strings) must **never** be logged to the console. These "spam" the scrollback and make it impossible for a developer to see meaningful logs.
- **Standard**: If it happens more than once per second, it shouldn't be a log.

## 4. High-Signal Event Logging
Reserve `console.log` for meaningful lifecycle transitions only:
- Server initialization/ready state.
- Successful user authentication.
- Explicit tool calls or action executions (e.g., `[Action] Clicked 'Apply'`).
- Critical, non-retriable fatal errors.

## 5. Visual Consistency
Use emojis sparingly but consistently to categorize logs:
- 🚀 : System Start
- 📡 : Network/Server Status
- ✅ : Success
- ⚠️ : Throttled Warning
- 💥 : Fatal Crash
- 🎙️ : Voice/Narrator Lifecycle (Start/Stop only)

---
*Last Updated: 2026-03-10*
