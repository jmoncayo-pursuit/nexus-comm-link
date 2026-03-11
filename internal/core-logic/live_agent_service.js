import { GoogleGenAI } from '@google/genai';
import * as NexusService from './nexus_service.js';

export class LiveAgentService {
    constructor(bridgeService) {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            vertexai: false,
            apiVersion: 'v1alpha'
        });
        this.bridgeService = bridgeService;
        this.session = null;
        this.lastThoughtSent = new Set();
        this.lastHtmlSize = null;
        this.lastFillerTime = 0;
        this.lastHistoryHash = "";
        this.isSyncing = false;
        this.isStarted = false;
    }

    async start() {
        if (this.isStarted) return;
        this.isStarted = true;
        
        console.log("🎙️ [Narrator Mode]: Initializing Gemini Live Session...");
        try {
            if (!this.ai.live || typeof this.ai.live.connect !== 'function') {
                console.warn("⚠️  Gemini Live API not found. Simulation Mode active.");
                this.startThoughtObserver();
                return;
            }

            const modelName = process.env.LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';

            this.session = await this.ai.live.connect({
                model: modelName,
                config: {
                    responseModalities: ["AUDIO"],
                    systemInstruction: {
                        parts: [{
                            text: `You are the Nexus Narrator. 
                            
CORE RULES:
1. NEVER REPEAT WHAT YOU SEE IN 'PREVIOUS_CONTEXT' OR 'IDE_THOUGHT_CONTEXT'.
2. NEVER ACKNOWLEDGE THAT YOU ARE RECEIVING CONTEXT UPDATES.
3. ONLY SPEAK IF THE USER ASKS A QUESTION OR IF THERE IS A SIGNIFICANT NEW STATUS TO REPORT.
4. BE CONCISE. ONE SENTENCE MAX.`
                        }]
                    },
                    tools: [{
                        functionDeclarations: [{
                            name: "triggerActionRelay",
                            description: "Triggers the active Action Relay button (e.g. Apply, Accept, Undo, Reject).",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    actionName: { type: "STRING", description: "The button to click" }
                                },
                                required: ["actionName"]
                            }
                        }]
                    }]
                },
                callbacks: {
                    onopen: () => {
                        console.log("🎙️ [Narrator Mode]: Session Connected.");
                    },
                    onmessage: async (data) => {
                        if (data.setupComplete) {
                            console.log("🎙️ [Narrator Mode]: Ready.");
                        }
                        
                        // Audio relay logic (unchanged)
                        if (data.serverContent?.modelTurn?.parts) {
                            for (const part of data.serverContent.modelTurn.parts) {
                                if (part.inlineData) {
                                    this.bridgeService.broadcast({
                                        type: 'audio_narrator',
                                        data: part.inlineData.data,
                                        mimeType: part.inlineData.mimeType
                                    });
                                }
                            }
                        }

                        if (data.toolCall) {
                            for (const call of data.toolCall.functionCalls) {
                                const { name, args, id } = call;
                                if (name === "triggerActionRelay") {
                                    const cdp = this.bridgeService.getConnection();
                                    if (cdp) {
                                        const result = args.actionName.toLowerCase() === 'undo' 
                                            ? await NexusService.triggerUndo(cdp)
                                            : await NexusService.clickActionButton(cdp, args.actionName);
                                        
                                        this.session.sendToolResponse({
                                            functionResponses: [{
                                                id, name,
                                                response: { success: !!result.success }
                                            }]
                                        });
                                    }
                                }
                            }
                        }
                    },
                    onerror: (err) => console.error("🎙️ [Narrator Mode] Error:", err),
                    onclose: (e) => console.warn("🎙️ [Narrator Mode]: Session Closed.")
                }
            });

            this.startThoughtObserver();
            this.initAudioRelay();
        } catch (error) {
            console.error("⚠️ Failed to start Live Session:", error.message);
            this.isStarted = false;
        }
    }

    initAudioRelay() {
        this.bridgeService.onMessage('audio_stream', (data) => {
            if (this.session && typeof this.session.sendRealtimeInput === 'function') {
                this.session.sendRealtimeInput({
                    audio: {
                        data: data.audio,
                        mimeType: data.mimeType || 'audio/pcm;rate=16000'
                    }
                });
            }
        });
    }

    scrubPII(text) {
        if (!text) return "";
        return text
            .replace(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-z]{2,6}/g, "[EMAIL_REDACTED]")
            .replace(/\b(sk-[a-zA-Z0-9]{20,})\b/g, "[SECRET_REDACTED]")
            .replace(/\b(AIzaSy[a-zA-Z0-9_-]{33})\b/g, "[API_KEY_REDACTED]")
            .replace(/password\s*[:=]\s*['"][^'"]+['"]/gi, "password: [PASSWORD_REDACTED]")
            .replace(/bearer\s+[a-zA-Z0-9\._\-]{20,}/gi, "bearer [TOKEN_REDACTED]")
            .replace(/(\.env|config\.json|secrets\.js)/gi, "[SENSITIVE_FILE_NAME]");
    }

    startThoughtObserver() {
        setInterval(() => {
            const snapshot = this.bridgeService.getLastSnapshot();
            if (!snapshot || !snapshot.html) return;

            if (this.lastHtmlSize === snapshot.stats?.htmlSize) return;
            this.lastHtmlSize = snapshot.stats?.htmlSize;

            const htmlContent = snapshot.html;
            const thoughtBlocks = [];

            const summaryRegex = /<(summary|div)[^>]*>(Thought[\s\S]*?)<\/\1>/gi;
            let match;
            while ((match = summaryRegex.exec(htmlContent)) !== null) {
                thoughtBlocks.push(match[2]);
            }

            const inlineThoughtRegex = />\s*((?:Thought|Thinking):\s*[^<]+)</gi;
            while ((match = inlineThoughtRegex.exec(htmlContent)) !== null) {
                if (!thoughtBlocks.includes(match[1])) thoughtBlocks.push(match[1]);
            }

            for (const thoughtText of thoughtBlocks) {
                let cleaned = thoughtText.trim();
                cleaned = this.scrubPII(cleaned);

                if (cleaned.length > 5 && !this.lastThoughtSent.has(cleaned)) {
                    this.lastThoughtSent.add(cleaned);

                    if (this.session && typeof this.session.sendClientContent === 'function') {
                        this.session.sendClientContent({
                            turns: [{ role: "user", parts: [{ text: "BACKGROUND_CONTEXT: IDE is thinking: " + cleaned }] }],
                            turnComplete: false
                        });
                    }
                }
            }

            // Sync full chat history (user/assistant)
            this.syncChatHistory(snapshot.html);

            if (this.lastThoughtSent.size > 200) this.lastThoughtSent.clear();
        }, 5000); // Increased interval to 5s to reduce context spam
    }

    async syncChatHistory(html) {
        if (!this.session || typeof this.session.sendClientContent !== 'function' || this.isSyncing) return;

        const history = NexusService.extractChatHistoryFromHTML(html);
        if (history.length === 0) return;
        
        const historyHash = JSON.stringify(history);
        if (this.lastHistoryHash === historyHash) return;
        
        this.isSyncing = true;
        try {
            this.lastHistoryHash = historyHash;
            // Quiet background sync, no log spam unless user asks
            
            const turns = history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: `BACKGROUND_CONTEXT (HistoricalTurn): [${msg.role}] ${msg.text}` }]
            }));

            this.session.sendClientContent({
                turns: turns,
                turnComplete: false 
            });
        } finally {
            this.isSyncing = false;
        }
    }

    async triggerProactiveFiller(thoughtSample) {
        if (!this.session || typeof this.session.sendClientContent !== 'function') return;
        this.session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: `SYSTEM_PROMPT: The user has been quiet for 15s. IDE is thinking: "${thoughtSample.substring(0, 100)}...". Please provide a 1-sentence vocal status update.` }] }],
            turnComplete: true
        });
        console.log(`[Narrator Mode]: Triggering proactive filler...`);
    }
}
