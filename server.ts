import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. API Route: AI-powered grammar explanation
  app.post('/api/explain', async (req, res) => {
    try {
      const { verb, pronoun, tense, question, answer, explanation } = req.body;

      if (!verb || !tense || !pronoun) {
        return res.status(400).json({ error: 'Missing required verb metadata.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Return fallback explanation constructed locally
        return res.json({
          explanation: `[Explicación Local - Registra tu clave para activar IA] En español, la forma conjugada de "${verb}" para "${pronoun}" en "${tense}" es "${answer}". \n\nRegla general: ${explanation}`
        });
      }

      // Initialize Gemini safely
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Como profesor nativo de español, explica de manera clara, entusiasta y didáctica por qué la respuesta correcta para:
- Verbo: "${verb}"
- Tiempo verbal: "${tense}"
- Pronombre sujeto: "${pronoun}"
- Pregunta del juego: "${question}"
es exactamente "${answer}".

Haz hincapié en la regla ortográfica o de conjugación rítmica implicada. Limita tu explicación a un máximo de 3-4 párrafos estructurados y con viñetas estéticas. Usa markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Eres un profesor experto de español para extranjeros. Hablas con un lenguaje motivador, ameno, claro y estructurado con markdown.'
        }
      });

      res.json({ explanation: response.text || 'No se pudo generar una explicación en este momento.' });
    } catch (error: any) {
      console.error('Gemini explanation error:', error);
      res.status(500).json({ error: 'Fallo al conectar con el asistente de gramática IA. Inténtalo de nuevo.' });
    }
  });

  // 2. Vite Asset serving middleware for Single-Page React context
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Pasapalabra Server] corriendo exitosamente en el puerto ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Pasapalabra Server] Error de inicialización:', err);
});
