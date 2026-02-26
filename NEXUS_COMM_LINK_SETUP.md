# 🧠 Nexus Comm-Link (Browser) - Manual Setup Required

To enable the **Nexus Intelligence** to see through your eyes (the browser), you must manually grant permission at the OS/Browser level.

## 🚀 Execution Steps

1. **Enable Remote Debugging:**
   - Open a new tab in Chrome and navigate to: `chrome://inspect/#remote-debugging`
   - Toggle **"Allow remote debugging for this browser instance"** to **ON**.
   - Note the server address provided (usually `127.0.0.1:49375` or similar).

2. **Grant Connection Permission:**
   - When the Nexus server starts, Chrome will show a system dialog:
     > "Allow remote debugging for this browser instance?"
   - Click **Allow**.

3. **Verify the Link:**
   - Go to the **Tactical Services** panel in the War Room.
   - The **"Comm-Link (Browser)"** status should switch to **STABLE**.
   - If it remains OFFLINE, ensure no other debugging sessions are active and refresh the War Room page.

## 🔍 Capabilities Unlocked
Once linked, the Intelligence can:
- **Analyze DOM:** Extract live site data for match analysis.
- **Audit Console:** Identify UI glitches or state inconsistencies in real-time.
- **Performance Trace:** (Coming Soon) High-fidelity bottleneck analysis.

---
*Note: This feature is advanced and should only be enabled in a trusted environment.*
