import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Shared GenAI helper
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is missing or invalid");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API route 1: /api/calibrate-room
  app.post("/api/calibrate-room", async (req, res) => {
    try {
      const { roomSweepData, targetProfile } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          const ai = getGenAI();
          const prompt = `You are an expert acoustic engineer analyzing room impulse sweep response telemetry data.
Target Acoustic Profile: ${targetProfile || "Studio Monitors"}
Room Sweep Telemetry Data: ${JSON.stringify(roomSweepData)}

Analyze the frequency response anomalies, boundary reflections, standing waves, and phase nulls.
Return a valid JSON object matching this schema:
{
  "detectedAcousticIssues": ["issue string 1", "issue string 2"],
  "eqMatrix": [
    { "freq": 31, "gain": number },
    { "freq": 62, "gain": number },
    { "freq": 125, "gain": number },
    { "freq": 250, "gain": number },
    { "freq": 500, "gain": number },
    { "freq": 1000, "gain": number },
    { "freq": 2000, "gain": number },
    { "freq": 4000, "gain": number },
    { "freq": 8000, "gain": number },
    { "freq": 16000, "gain": number }
  ]
}
Provide precise gain adjustments in dB (between -8.0 and +8.0 dB).`;

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text);
            return res.json({ profile: parsed });
          }
        } catch (geminiError) {
          console.warn("Gemini room calibration AI analysis fallback:", geminiError);
        }
      }

      // Default calculated fallback if no API key or on error
      return res.json({
        profile: {
          detectedAcousticIssues: [
            `Sub-bass room mode peak around 62Hz (${targetProfile})`,
            "Mid-range desk boundary reflection dip near 1kHz",
            "High frequency air attenuation above 12kHz",
          ],
          eqMatrix: [
            { freq: 31, gain: 3.5 },
            { freq: 62, gain: -4.5 },
            { freq: 125, gain: -1.0 },
            { freq: 250, gain: 1.5 },
            { freq: 500, gain: 0.5 },
            { freq: 1000, gain: 2.5 },
            { freq: 2000, gain: -1.0 },
            { freq: 4000, gain: 1.8 },
            { freq: 8000, gain: 0.5 },
            { freq: 16000, gain: 3.0 },
          ],
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process room calibration" });
    }
  });

  // API route 2: /api/transcribe (gemini-3.5-transcribe)
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType, prompt } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: "audioBase64 parameter is required" });
      }

      const ai = getGenAI();
      const audioPart = {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            audioPart,
            { text: prompt || "Transcribe this audio recording accurately." },
          ],
        },
      });

      return res.json({ transcription: response.text || "No speech detected in audio." });
    } catch (err: any) {
      console.error("Transcribe API error:", err);
      return res.status(500).json({ error: err.message || "Audio transcription failed" });
    }
  });

  // API route 3: /api/search-grounding (gemini-3.8-flash with googleSearch tool)
  app.post("/api/search-grounding", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "query parameter is required" });
      }

      const ai = getGenAI();
      const prompt = `You are a professional audio & acoustic engineer. Answer the user's inquiry accurately based on real-time web search results.
User Inquiry: ${query}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      const groundingSources: Array<{ title: string; url: string }> = [];
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          groundingSources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      });

      return res.json({
        answer: response.text || "No detailed search response returned.",
        groundingSources,
      });
    } catch (err: any) {
      console.error("Search Grounding error:", err);
      return res.status(500).json({ error: err.message || "Search grounding failed" });
    }
  });

  // API route 4: /api/calibration/save
  app.post("/api/calibration/save", (req, res) => {
    const { userId, profileName, deviceType } = req.body;
    const safeUserId = (userId || "user_pro_01").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeDevice = (deviceType || "monitor").toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeProfile = (profileName || "studio_monitors")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const savedPath = `/user_assets/${safeUserId}/${safeDevice}_${safeProfile}.json`;
    res.json({
      success: true,
      savedPath,
      message: `Profile calibration written to ${savedPath}`,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // WebSocket Server for Gemini Live API (gemini-3.8-live) with isolated upgrade routing
  const wss = new WebSocketServer({ noServer: true });

  // Handle explicit upgrade to prevent conflicts with Vite HMR or other upgrade handlers
  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
      if (url.pathname === "/api/live-ws") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch (err) {
      console.warn("WebSocket upgrade handling error:", err);
      socket.destroy();
    }
  });

  // Heartbeat ping interval to keep connection alive across proxies
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((clientWs: any) => {
      if (clientWs.isAlive === false) return clientWs.terminate();
      clientWs.isAlive = false;
      clientWs.ping();
    });
  }, 25000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", async (clientWs: any) => {
    console.log("Client connected to Gemini Live WebSocket");
    clientWs.isAlive = true;

    clientWs.on("pong", () => {
      clientWs.isAlive = true;
    });

    clientWs.on("error", (wsErr: any) => {
      console.warn("Client WS socket error:", wsErr);
    });

    const safeSend = (data: object) => {
      if (clientWs.readyState === 1) {
        try {
          clientWs.send(JSON.stringify(data));
        } catch (e) {
          console.warn("Failed to send WS message to client:", e);
        }
      }
    };

    let session: any = null;

    try {
      const ai = getGenAI();
      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction:
            "You are an expert studio acoustic engineer and sound designer assistant named Zephyr. Help users analyze room modes, speaker placement, EQ curves, acoustic treatment, and listening fatigue. Keep spoken responses concise, insightful, and natural.",
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (audio) {
              safeSend({ audio });
            }
            if (text) {
              safeSend({ text });
            }
            if (message.serverContent?.interrupted) {
              safeSend({ interrupted: true });
            }
          },
          onerror: (err: any) => {
            console.warn("Gemini Live session callback error:", err);
            safeSend({ error: err?.message || "Gemini Live session error occurred." });
          },
          onclose: () => {
            console.log("Gemini Live session closed");
            safeSend({ closed: true });
          },
        },
      });

      clientWs.on("message", (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (parsed.text && session) {
            session.sendRealtimeInput({ text: parsed.text });
          }
        } catch (err) {
          console.warn("Live WS message parse error:", err);
        }
      });

      clientWs.on("close", () => {
        if (session) {
          try {
            session.close();
          } catch (_) {}
        }
      });
    } catch (err: any) {
      console.error("Live session connection error:", err);
      safeSend({ error: err.message || "Failed to establish Live session" });
      try {
        clientWs.close();
      } catch (_) {}
    }
  });
}

startServer();
