import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY!);

router.post('/chat', verifyToken, async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const chat = model.startChat({
      history: (history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.json({ content: text });
  } catch (error) {
    console.error('Gemini AI error:', error);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

export default router;
