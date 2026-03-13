import { WebSocket } from 'ws';
import { captureSnapshot, injectMessage, clickActionButton, triggerUndo } from './nexus_service.js';

export class VoiceService {
    constructor(bridgeService) {
        this.bridgeService = bridgeService;
        this.geminiWs = null;
        this.clientWs = null; // The mobile/browser client
        this.apiKey = process.env.GEMINI_API_KEY;
        let modelName = process.env.LIVE_MODEL || 'gemini-2.0-flash-exp';
        this.model = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
        this.isSessionActive = false;
        this.lastSnapshotSent = 0;
        this.snapshotInterval = 1000; // 1 second
    }

    async startSession(clientWs) {
        if (this.isSessionActive) return;
        this.clientWs = clientWs;
        this.isSessionActive = true;

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
        const keyPreview = this.apiKey ? this.apiKey.substring(0, 4) + '...' : 'MISSING';
        console.log(`[VOICE] Connecting to Gemini Live API with key ${keyPreview}...`);
        this.geminiWs = new WebSocket(url);

        this.geminiWs.on('open', () => {
            console.log('[VOICE] Connected to Gemini');
            this.sendConfig();
        });

        this.geminiWs.on('message', (data) => {
            const str = data.toString();
            // Log structure for debugging
            try {
                const response = JSON.parse(str);
                console.log('[VOICE] Gemini Message Keys:', Object.keys(response));
                this.handleGeminiMessage(response);
            } catch (e) {
                console.log('[VOICE] Non-JSON Gemini Message:', str.substring(0, 100));
            }
        });

        this.geminiWs.on('close', (code, reason) => {
            console.log(`[VOICE] Gemini connection closed: code=${code}, reason=${reason}`);
            this.stopSession();
        });

        this.geminiWs.on('error', (err) => {
            console.error('[VOICE] Gemini socket error:', err);
            // Don't stop immediately, wait for close
        });
    }

    stopSession() {
        this.isSessionActive = false;
        if (this.geminiWs) {
            this.geminiWs.close();
            this.geminiWs = null;
        }
        if (this.clientWs) {
            this.clientWs.send(JSON.stringify({ type: 'voice_status', status: 'inactive' }));
        }
        console.log('[VOICE] Session stopped');
    }

    sendConfig() {
        const config = {
            setup: {
                model: this.model,
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: "Puck" 
                            }
                        }
                    }
                },
                systemInstruction: {
                    parts: [{
                        text: `You are Nexus, a powerful conversational AI bridge between the user and their IDE.
You can see a snapshot of the user's IDE (HTML/CSS) which will be sent to you periodically.
Your goal is to help the user with their code, explaining changes, suggesting fixes, and performing actions.

8. You MUST ALWAYS ASK FOR CONFIRMATION before executing ANY action or sending a message to the IDE.
9. ONLY call tools after receiving a clear affirmative from the user.
10. If the user asks for a task that takes time (like "push code" or "refactor file"), reassure them that you will notify them as soon as it's finished.
11. You will receive [SYSTEM NOTIFICATION] messages when background tasks complete. When you see this, interrupt the current flow (if appropriate) to briefly announce the success to the user.
12. Be concise, futuristic, and helpful.
13. You receive 16kHz Mono 16-bit Little Endian PCM audio. Respond with audio.`
                    }]
                },
                tools: [{
                    functionDeclarations: [
                        {
                            name: "injectMessage",
                            description: "Sends a message or code fix to the IDE chat area.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    message: { type: "STRING", description: "The message or code fix to send." }
                                },
                                required: ["message"]
                            }
                        },
                        {
                            name: "clickActionButton",
                            description: "Clicks one of the action buttons like Apply, Accept, or Reject.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    action: { type: "STRING", description: "The text of the button to click (e.g., 'Apply', 'Accept', 'Reject')." }
                                },
                                required: ["action"]
                            }
                        },
                        {
                            name: "triggerUndo",
                            description: "Triggers an Undo action in the IDE.",
                            parameters: { type: "OBJECT", properties: {} }
                        }
                    ]
                }]
            }
        };
        console.log('[VOICE] Sending config:', JSON.stringify(config));
        this.geminiWs.send(JSON.stringify(config));
    }

    async startSnapshotLoop() {
        let lastHash = '';
        while (this.isSessionActive) {
            const snapshot = this.bridgeService.getLastSnapshot();
            const currentHash = this.bridgeService.lastSnapshotHash;
            
            if (snapshot && currentHash !== lastHash) {
                this.sendSnapshot(snapshot);
                lastHash = currentHash;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    sendSnapshot(snapshot) {
        if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) return;

        // Using client_content to update Gemini's "vision" of the DOM
        const clientContent = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: `[IDE CONTEXT UPDATE]\n${snapshot.html.substring(0, 15000)}` }] 
                }],
                turnComplete: false
            }
        };
        this.geminiWs.send(JSON.stringify(clientContent));
    }

    handleGeminiMessage(msg) {
        if (msg.setupComplete || msg.setup_complete) {
            console.log('[VOICE] Setup complete');
            this.startSnapshotLoop();
            
            // Send readiness to client
            if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
                this.clientWs.send(JSON.stringify({
                    type: 'voice_status',
                    status: 'ready'
                }));
            }
            
            // Trigger greeting turn
            const greeting = {
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{ text: "Hello! Please greet me briefly and let me know you're connected and ready to assist with my code." }]
                    }],
                    turnComplete: true
                }
            };
            this.geminiWs.send(JSON.stringify(greeting));
            return;
        }

        const serverContent = msg.serverContent || msg.server_content;
        if (serverContent) {
            if (serverContent.modelTurn || serverContent.model_turn) {
                const turn = serverContent.modelTurn || serverContent.model_turn;
                const parts = turn.parts;
                for (const part of parts) {
                    const inlineData = part.inlineData || part.inline_data;
                    if (inlineData) {
                        // Relay audio back to client
                        if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
                            this.clientWs.send(JSON.stringify({
                                type: 'voice_audio',
                                data: inlineData.data
                            }));
                        }
                    }
                    if (part.text) {
                        console.log('[VOICE] Gemini Text:', part.text);
                        // Forward transcript to client
                        if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
                            this.clientWs.send(JSON.stringify({
                                type: 'voice_transcript',
                                text: part.text
                            }));
                        }
                    }
                }
            }
            if (serverContent.turnComplete || serverContent.turn_complete) {
                // Done with this turn
            }
        }

        const toolCall = msg.toolCall || msg.tool_call;
        if (toolCall) {
            this.handleToolCall(toolCall);
        }
    }

    async handleToolCall(toolCall) {
        const calls = toolCall.functionCalls || toolCall.function_calls;
        const responses = [];

        for (const call of calls) {
            console.log(`[VOICE] Gemini Tool Call: ${call.name}`, call.args);
            let result;
            const cdp = this.bridgeService.getConnection();
            
            if (!cdp) {
                result = { error: 'CDP not connected' };
            } else {
                try {
                    if (call.name === 'injectMessage') {
                        result = await injectMessage(cdp, call.args.message);
                    } else if (call.name === 'clickActionButton') {
                        result = await clickActionButton(cdp, call.args.action);
                    } else if (call.name === 'triggerUndo') {
                        result = await triggerUndo(cdp);
                    }
                } catch (err) {
                    result = { error: err.message };
                }
            }

            responses.push({
                name: call.name,
                id: call.id,
                response: { result }
            });
        }

        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
            this.geminiWs.send(JSON.stringify({
                toolResponse: { functionResponses: responses }
            }));
        }
    }

    reportTaskComplete(taskName) {
        if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) {
            console.warn('[VOICE] Cannot report task complete - Gemini not connected');
            return;
        }

        console.log(`[VOICE] Reporting completion of task: ${taskName}`);
        
        // Send a system-initiated turn to Gemini Live
        const completionNotice = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: `[SYSTEM NOTIFICATION] The task "${taskName}" has been completed successfully. Please inform the user concisely.` }]
                }],
                turnComplete: true
            }
        };
        this.geminiWs.send(JSON.stringify(completionNotice));
    }

    handleClientAudio(base64Audio) {
        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
            this.geminiWs.send(JSON.stringify({
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Audio
                    }]
                }
            }));
        }
    }
}
