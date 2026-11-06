// Real-time bidirectional Gemini Live API session client for SARA Executive Operations Voice Calls

export type CallStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "error"
  | "ended";

export interface LiveRetrievedRecord {
  category: string;
  title: string;
  subtitle: string;
  highlightValue: string;
  status: string;
  structuredCard?: any;
}

export interface LiveSessionCallbacks {
  voiceName?: string;
  onStatusChange?: (status: CallStatus) => void;
  onSarahSpeaking?: (isSpeaking: boolean) => void;
  onUserSpeaking?: (isSpeaking: boolean) => void;
  onTranscription?: (text: string, isFinal: boolean) => void;
  onUserTranscription?: (text: string) => void;
  onToolExecution?: (isExecuting: boolean, toolLabel?: string) => void;
  onDataRetrieved?: (record: LiveRetrievedRecord) => void;
  onTurnExchange?: (
    userText: string,
    assistantText: string,
    record?: LiveRetrievedRecord | null
  ) => void;
  onError?: (errMessage: string) => void;
  onVolumeUpdate?: (userVolume: number, sarahVolume: number) => void;
  onAudioFrequencies?: (userFreqs: Uint8Array, sarahFreqs: Uint8Array) => void;
}

const LIVE_OPERATIONS_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "getExecutiveOperationsBriefing",
        description:
          "Retrieves the live company-wide Executive Operations Briefing for the GoldTouch Owner, including total revenue, total orders, shipped/processing/pending order counts, open and overdue accounts receivable invoices, active carrier shipments, and active dealership accounts.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "lookupSalesOrder",
        description:
          "Looks up a specific GoldTouch sales order by order number (e.g. 'SO-5486', '5486', 'SO-5507') or searches sales orders by dealership customer name ('Moses Nissan', 'Todd Judy Ford'), status ('pending', 'processing', 'shipped'), or timeframe ('today', 'this_week', 'recent').",
        parameters: {
          type: "OBJECT",
          properties: {
            order_number: {
              type: "STRING",
              description: "Specific order number such as 'SO-5486', '5486', or 'SO-5507'.",
            },
            customer_name: {
              type: "STRING",
              description: "Dealership customer name such as 'Moses Nissan' or 'Todd Judy Ford'.",
            },
            status: {
              type: "STRING",
              description: "Order status filter: 'pending', 'processing', 'shipped', or 'cancelled'.",
            },
            timeframe: {
              type: "STRING",
              description: "Timeframe filter such as 'today', 'this_week', or 'recent'.",
            },
          },
        },
      },
      {
        name: "lookupInvoicesAndReceivables",
        description:
          "Queries GoldTouch accounts receivable invoices, open balances, overdue invoices, paid invoices, or a specific invoice number (e.g. 'INV-5408') or dealership customer balance.",
        parameters: {
          type: "OBJECT",
          properties: {
            invoice_number: {
              type: "STRING",
              description: "Specific invoice number, e.g. 'INV-5408'.",
            },
            customer_name: {
              type: "STRING",
              description: "Dealership customer name to check open invoices for.",
            },
            status: {
              type: "STRING",
              description: "Invoice status: 'open', 'overdue', 'paid', or 'all'.",
            },
          },
        },
      },
      {
        name: "lookupShipmentsAndTracking",
        description:
          "Queries outbound carrier shipments, tracking numbers, carrier delivery status ('in_transit', 'delivered', 'pending'), or shipments for a specific order or dealership.",
        parameters: {
          type: "OBJECT",
          properties: {
            order_number: {
              type: "STRING",
              description: "Order number to check shipment tracking for.",
            },
            customer_name: {
              type: "STRING",
              description: "Dealership customer name.",
            },
            tracking_number: {
              type: "STRING",
              description: "Specific shipment or tracking number.",
            },
            status: {
              type: "STRING",
              description: "Shipment status filter: 'in_transit', 'delivered', or 'pending'.",
            },
          },
        },
      },
      {
        name: "lookupDealershipCustomer",
        description:
          "Searches GoldTouch's 289 dealership rooftop accounts and dealer groups (e.g. 'Moses AutoMall', 'Moses Nissan', 'Todd Judy Ford', 'Victory Toyota') to retrieve account spend, order count, open balance, and primary contact details.",
        parameters: {
          type: "OBJECT",
          properties: {
            customer_name: {
              type: "STRING",
              description: "Name of the dealership account or dealer group.",
            },
          },
          required: ["customer_name"],
        },
      },
      {
        name: "lookupPurchaseOrdersAndSuppliers",
        description:
          "Queries GoldTouch vendor purchase orders (e.g. 'PO-...') and supplier directory records (e.g. 'SanMar', 'S&S Activewear').",
        parameters: {
          type: "OBJECT",
          properties: {
            po_number: {
              type: "STRING",
              description: "Specific purchase order number.",
            },
            supplier_name: {
              type: "STRING",
              description: "Supplier or vendor name.",
            },
          },
        },
      },
      {
        name: "lookupCatalogAndApparelInventory",
        description:
          "Searches GoldTouch's dealership supply catalog (helium tanks, key tags, license plate frames, balloons, forms) AND the 9,753-style Corporate & Dealership Apparel catalog (Port Authority K500 polos, Nike, Carhartt, Richardson 112 caps, hoodies, jackets) for live stock, pricing, sizes, and colors.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Product name, style code, SKU, brand, or category (e.g. 'K500 polo', 'Carhartt jacket', 'Richardson 112', 'helium tank', 'key tags').",
            },
            style_code: {
              type: "STRING",
              description: "Apparel style code such as 'K500', '112', 'CTK87', 'J317', 'PC54'.",
            },
            brand: {
              type: "STRING",
              description: "Apparel brand such as 'Port Authority', 'Nike', 'Carhartt', 'Richardson', 'Sport-Tek'.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "retrieveEnterpriseData",
        description:
          "General catch-all live database lookup for any other question from the GoldTouch Owner across orders, revenue, CRM leads, sales reps, pricing rules, or operations.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "The exact operational question from the Owner.",
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];

export class SarahLiveVoiceSession {
  private ws: WebSocket | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private outputGainNode: GainNode | null = null;

  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlayTime: number = 0;
  private animationFrameId: number | null = null;
  private currentUserTurnText: string = "";
  private currentAssistantTurnText: string = "";
  private lastTurnRecord: LiveRetrievedRecord | null = null;

  public status: CallStatus = "idle";
  public isMicMuted: boolean = false;
  public isSpeakerMuted: boolean = false;
  public isSarahSpeaking: boolean = false;
  public isUserSpeaking: boolean = false;

  private callbacks: LiveSessionCallbacks;

  constructor(callbacks: LiveSessionCallbacks = {}) {
    this.callbacks = callbacks;
  }

  private setStatus(newStatus: CallStatus) {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  public async startCall(): Promise<void> {
    if (this.status === "connecting" || this.status === "connected") return;

    try {
      this.setStatus("connecting");

      // 1. Fetch ephemeral token from internal API route
      const tokenRes = await fetch("/api/live-token", { method: "POST" });
      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to get session token (${tokenRes.status})`);
      }

      const { token } = await tokenRes.json();
      if (!token) {
        throw new Error("No session token returned from server");
      }

      // 2. Setup user microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.mediaStream = stream;

      // 3. Setup Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioContext = new AudioCtx();
      this.outputAudioContext = new AudioCtx({ sampleRate: 24000 });

      if (this.inputAudioContext.state === "suspended") {
        await this.inputAudioContext.resume();
      }
      if (this.outputAudioContext.state === "suspended") {
        await this.outputAudioContext.resume();
      }

      // Output chain: outputAudioContext -> outputGainNode -> outputAnalyser -> destination
      this.outputGainNode = this.outputAudioContext.createGain();
      this.outputAnalyser = this.outputAudioContext.createAnalyser();
      this.outputAnalyser.fftSize = 64;
      this.outputGainNode.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputAudioContext.destination);

      // Input chain: mic -> inputSource -> inputAnalyser -> scriptProcessor -> destination
      this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
      this.inputAnalyser = this.inputAudioContext.createAnalyser();
      this.inputAnalyser.fftSize = 64;
      this.inputSource.connect(this.inputAnalyser);

      const bufferSize = 2048;
      this.scriptProcessor = this.inputAudioContext.createScriptProcessor(bufferSize, 1, 1);
      this.inputAnalyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioContext.destination);

      // 4. Connect WebSocket using ephemeral token
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.sendInitialSetup();
      };

      this.ws.onmessage = async (event) => {
        await this.handleWsMessage(event);
      };

      this.ws.onerror = (err) => {
        console.warn("[SarahLiveSession] WebSocket error:", err);
        this.callbacks.onError?.("Voice connection encountered an error.");
      };

      this.ws.onclose = (ev) => {
        console.log("[SarahLiveSession] WebSocket closed:", ev.code, ev.reason);
        if (this.status !== "ended") {
          this.setStatus("ended");
        }
      };

      // 5. Start audio processing and waveform analysis loops
      this.setupMicStreamProcessing();
      this.startAnalyserLoop();
    } catch (err: any) {
      console.warn("[SarahLiveSession] Failed to start call:", err);
      this.setStatus("error");
      this.callbacks.onError?.(
        err?.message || "Could not start voice call. Please check your microphone permissions."
      );
      this.endCall();
    }
  }

  private sendInitialSetup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const selectedVoice = this.callbacks.voiceName || "Aoede";

    const setupMessage = {
      setup: {
        model: "models/gemini-3.8-live",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice,
              },
            },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: LIVE_OPERATIONS_TOOLS,
        systemInstruction: {
          parts: [
            {
              text: `You are SARA, the charming, warm, articulate, and ultra-professional female AI Operations & Product Assistant for GoldTouch Dealer Supply.
CRITICAL ROLE & VOICE PERSONA:
1. Speak in a naturally charming, sweet, graceful, confident, and warm professional female voice—like a real, attentive executive assistant and product specialist on a live phone call.
2. You assist with BOTH internal enterprise ERP/CRM operations (executive briefings, sales orders, accounts receivable invoices, overdue dealership balances, carrier shipments, purchase orders, dealership accounts) AND GoldTouch product catalog, apparel inventory, and landing-site volume pricing tiers (1-2 units, 3-4 units, 5-9 units, 10+ units) plus internal unit cost and gross margin.
3. ALWAYS call your live operational tools (getExecutiveOperationsBriefing, lookupSalesOrder, lookupInvoicesAndReceivables, lookupShipmentsAndTracking, lookupDealershipCustomer, lookupPurchaseOrdersAndSuppliers, lookupCatalogAndApparelInventory, or retrieveEnterpriseData) whenever asked about any product, pricing tier, order, revenue, invoice, customer, shipment, PO, or apparel stock. Never guess or make up figures.
4. Keep your spoken responses concise, engaging, and natural (1 to 3 clear spoken sentences) with exact dollar amounts, SKU codes, volume price breaks, order numbers, and statuses. Never read markdown symbols or snake_case aloud.`,
            },
          ],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  private setupMicStreamProcessing(): void {
    if (!this.scriptProcessor || !this.inputAudioContext) return;

    const targetSampleRate = 16000;
    const inputSampleRate = this.inputAudioContext.sampleRate;

    this.scriptProcessor.onaudioprocess = (event) => {
      if (
        this.isMicMuted ||
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN ||
        this.status !== "connected"
      ) {
        return;
      }

      const inputBuffer = event.inputBuffer.getChannelData(0);

      // Check user voice volume to detect active speech
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      const isSpeaking = rms > 0.02;

      if (isSpeaking !== this.isUserSpeaking) {
        this.isUserSpeaking = isSpeaking;
        this.callbacks.onUserSpeaking?.(isSpeaking);
      }

      const resampled = this.resampleAudio(inputBuffer, inputSampleRate, targetSampleRate);
      const pcm16Buffer = this.floatTo16BitPCM(resampled);
      const base64Audio = this.arrayBufferToBase64(pcm16Buffer);

      const audioMessage = {
        realtimeInput: {
          audio: {
            data: base64Audio,
            mimeType: "audio/pcm;rate=16000",
          },
        },
      };

      try {
        this.ws.send(JSON.stringify(audioMessage));
      } catch (err) {
        console.warn("[SarahLiveSession] Error sending audio chunk:", err);
      }
    };
  }

  private async handleWsMessage(event: MessageEvent): Promise<void> {
    try {
      let rawText = "";
      if (event.data instanceof Blob) {
        rawText = await event.data.text();
      } else if (typeof event.data === "string") {
        rawText = event.data;
      } else {
        return;
      }

      const response = JSON.parse(rawText);

      // 1. Setup complete: greet warmly and charmingly as SARA
      if (response.setupComplete) {
        this.setStatus("connected");
        this.sendTextPrompt(
          "Greet the caller warmly and charmingly in 1 short sentence as SARA from GoldTouch Dealer Supply, and ask what product pricing, inventory, order, or operations briefing you can pull up for them right now.",
          true
        );
        return;
      }

      // 2. Handle live tool calls from Gemini 3.8 Live
      if (response.toolCall && Array.isArray(response.toolCall.functionCalls)) {
        await this.handleLiveToolCalls(response.toolCall.functionCalls);
      }

      // 3. Server content updates (audio & transcriptions)
      if (response.serverContent) {
        const sc = response.serverContent;

        if (sc.interrupted) {
          this.interruptPlayback();
          return;
        }

        if (sc.inputTranscription?.text) {
          this.currentUserTurnText += sc.inputTranscription.text;
          this.callbacks.onUserTranscription?.(this.currentUserTurnText.trim());
        }

        if (sc.outputTranscription?.text) {
          this.currentAssistantTurnText += sc.outputTranscription.text;
          this.callbacks.onTranscription?.(sc.outputTranscription.text, false);
        }

        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData && part.inlineData.data) {
              this.enqueueAudioChunk(part.inlineData.data);
            }
          }
        }

        if (sc.turnComplete) {
          this.callbacks.onTranscription?.("", true);
          const finalUser = this.currentUserTurnText.trim();
          const finalAssistant = this.currentAssistantTurnText.trim();
          const turnRecord = this.lastTurnRecord;

          if (finalAssistant) {
            this.callbacks.onTurnExchange?.(finalUser, finalAssistant, turnRecord);
          }

          this.currentUserTurnText = "";
          this.currentAssistantTurnText = "";
          this.lastTurnRecord = null;
        }
      }
    } catch (err) {
      console.warn("[SarahLiveSession] Failed to parse message:", err);
    }
  }

  private async handleLiveToolCalls(functionCalls: Array<{ id: string; name: string; args?: any }>): Promise<void> {
    const toolLabelMap: Record<string, string> = {
      getExecutiveOperationsBriefing: "SARA is checking live Executive Operations Briefing...",
      lookupSalesOrder: "SARA is checking live GoldTouch sales orders...",
      lookupInvoicesAndReceivables: "SARA is checking Accounts Receivable ledger...",
      lookupShipmentsAndTracking: "SARA is checking live carrier shipments...",
      lookupDealershipCustomer: "SARA is checking dealership account profile...",
      lookupPurchaseOrdersAndSuppliers: "SARA is checking vendor purchase orders...",
      lookupCatalogAndApparelInventory: "SARA is checking catalog stock & pricing tiers...",
      retrieveEnterpriseData: "SARA is checking GoldTouch enterprise database...",
    };

    const firstCall = functionCalls[0];
    this.callbacks.onToolExecution?.(
      true,
      toolLabelMap[firstCall?.name] || "SARA is checking live GoldTouch records..."
    );

    const functionResponses: Array<{ id: string; name: string; response: any }> = [];

    for (const fc of functionCalls) {
      try {
        const res = await fetch("/api/live-tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolName: fc.name,
            args: fc.args || {},
          }),
        });

        const data = await res.json();
        if (data?.uiRecord) {
          this.lastTurnRecord = data.uiRecord;
          this.callbacks.onDataRetrieved?.(data.uiRecord);
        }

        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: {
            result: data?.result || { spokenSummary: "Record retrieved." },
          },
        });
      } catch (err: any) {
        console.warn(`[SarahLiveSession] Tool execution error (${fc.name}):`, err);
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: {
            error: err?.message || "Database lookup error",
          },
        });
      }
    }

    this.callbacks.onToolExecution?.(false);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const toolResponseMessage = {
        toolResponse: {
          functionResponses,
        },
      };
      this.ws.send(JSON.stringify(toolResponseMessage));
    }
  }

  private enqueueAudioChunk(base64Pcm: string): void {
    if (!this.outputAudioContext || !this.outputGainNode) return;

    try {
      const float32Data = this.base64ToFloat32(base64Pcm);
      if (float32Data.length === 0) return;

      const audioBuffer = this.outputAudioContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.copyToChannel(float32Data as Float32Array<ArrayBuffer>, 0);

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputGainNode);

      const currentTime = this.outputAudioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);
      if (!this.isSarahSpeaking) {
        this.isSarahSpeaking = true;
        this.callbacks.onSarahSpeaking?.(true);
      }

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (
          this.activeSources.length === 0 &&
          this.outputAudioContext &&
          this.outputAudioContext.currentTime >= this.nextPlayTime
        ) {
          this.isSarahSpeaking = false;
          this.callbacks.onSarahSpeaking?.(false);
        }
      };
    } catch (err) {
      console.warn("[SarahLiveSession] Audio enqueue error:", err);
    }
  }

  public interruptPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioContext) {
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }
    if (this.isSarahSpeaking) {
      this.isSarahSpeaking = false;
      this.callbacks.onSarahSpeaking?.(false);
    }
  }

  public sendTextPrompt(text: string, isSystemGreeting: boolean = false): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!isSystemGreeting) {
      this.currentUserTurnText = text;
    }
    const msg = {
      realtimeInput: {
        text,
      },
    };
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.warn("[SarahLiveSession] Error sending prompt:", err);
    }
  }

  public setMicMuted(muted: boolean): void {
    this.isMicMuted = muted;
    if (muted) {
      this.isUserSpeaking = false;
      this.callbacks.onUserSpeaking?.(false);
    }
  }

  public setSpeakerMuted(muted: boolean): void {
    this.isSpeakerMuted = muted;
    if (this.outputGainNode && this.outputAudioContext) {
      this.outputGainNode.gain.setValueAtTime(muted ? 0 : 1, this.outputAudioContext.currentTime);
    }
  }

  private startAnalyserLoop(): void {
    const userFreqs = new Uint8Array(32);
    const sarahFreqs = new Uint8Array(32);

    const tick = () => {
      if (this.status === "ended" || this.status === "error") return;

      let userVol = 0;
      let sarahVol = 0;

      if (this.inputAnalyser && !this.isMicMuted) {
        this.inputAnalyser.getByteFrequencyData(userFreqs);
        let sum = 0;
        for (let i = 0; i < userFreqs.length; i++) {
          sum += userFreqs[i];
        }
        userVol = sum / (userFreqs.length * 255);
      }

      if (this.outputAnalyser && !this.isSpeakerMuted && this.isSarahSpeaking) {
        this.outputAnalyser.getByteFrequencyData(sarahFreqs);
        let sum = 0;
        for (let i = 0; i < sarahFreqs.length; i++) {
          sum += sarahFreqs[i];
        }
        sarahVol = sum / (sarahFreqs.length * 255);
      }

      this.callbacks.onVolumeUpdate?.(userVol, sarahVol);
      this.callbacks.onAudioFrequencies?.(userFreqs, sarahFreqs);

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public endCall(): void {
    this.setStatus("ended");

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.interruptPlayback();

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioContext) {
      try {
        this.inputAudioContext.close();
      } catch {}
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext) {
      try {
        this.outputAudioContext.close();
      } catch {}
      this.outputAudioContext = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  private resampleAudio(
    audioData: Float32Array,
    inputSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (inputSampleRate === targetSampleRate) return audioData;

    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const originalIndex = i * ratio;
      const indexFloor = Math.floor(originalIndex);
      const indexCeil = Math.min(audioData.length - 1, indexFloor + 1);
      const fraction = originalIndex - indexFloor;
      result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
    }

    return result;
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  private base64ToFloat32(base64: string): Float32Array {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const dataView = new DataView(bytes.buffer);
    const numSamples = Math.floor(len / 2);
    const float32 = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
    }
    return float32;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
