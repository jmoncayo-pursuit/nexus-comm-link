# Nexus Comm-Link: Mobile Recording Protocol (Pixel/Android 10)

## Hardware/Software Context
- **Device:** Google Pixel / Android 10+
- **Browser:** Firefox (Mobile)
- **Tool:** Native Android Screen Recorder

## The Recording Setup (The "Perfect Succeed" Method)
Follow these steps exactly to capture the Nexus Voice Agent and your commands without audio conflicts:

1. **Swipe Down:** Open your Android System Quick Settings.
2. **Trigger Recorder:** Click the **Screen Record** start button.
3. **Select App:** Choose **Record on App**.
4. **Choose Firefox:** Select Firefox from the list of open apps.
5. **Set Audio Path (CRITICAL):**
   - Check the **Record Audio** toggle.
   - Select **Microphone** (NOT "Device Audio" or "Device Audio & Mic").
6. **Start:** Hit **Record**.
7. **The Countdown:** The system will start a 3-second countdown, then recording will begin.

## Rationale
Android 10's security policy prevents browsers from sharing the "Internal Audio" path while the microphone is active. Selecting "Microphone" forces the recorder to capture the physical speaker output and your voice simultaneously, bypassing the software lock.

## Troubleshooting "Mic Stalled"
If you see the notification **"Mic Stalled - Check Recorder"**:
- Android has prioritized the Screen Recorder's mic seizure over the Browser.
- Stop recording, toggle Nexus voice OFF/ON, and restart ensures "Microphone" only is selected.
