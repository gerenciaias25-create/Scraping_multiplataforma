const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/openrouter/process
// Recibe: { skillType: "emociones" | "opositor" | "bivariado", rawData: [...] }
router.post('/process', async (req, res) => {
  try {
    const { skillType, rawData } = req.body;
    const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

    if (!OPENROUTER_KEY) {
      return res.status(500).json({ error: 'Falta la variable OPENROUTER_KEY en el servidor.' });
    }

    // Prompts específicos para garantizar el schema JSON exacto de cada plantilla
    const systemPrompts = {
      emociones: `Eres un analista de datos. Procesa el texto provisto y responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
      {
        "territory": "Nombre del Tema/Candidato",
        "emotions": { "ira": 0, "miedo": 0, "anticipacion": 0, "tristeza": 0, "asco": 0, "alegria": 0, "confianza": 0, "sorpresa": 0 },
        "dyads": [],
        "partidos": [],
        "actores": []
      }
      (Los valores de emociones deben ser porcentajes numéricos de 0 a 100 que sumen 100).`,

      opositor: `Eres un estratega político. Procesa el texto provisto y responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
      {
        "candidato": "Nombre del Opositor",
        "vulnerabilidades": [{ "categoria": "", "nivel": "", "descripcion": "" }],
        "contradicciones": [{ "tema": "", "citaOposicion": "", "realidad": "" }],
        "vectoresAtaque": [{ "eje": "", "impacto": "", "narrativaRecomendada": "" }]
      }`,

      bivariado: `Eres un científico de datos. Procesa el texto provisto y responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
      {
        "sentimiento": { "positivo": 0, "neutro": 0, "negativo": 0 },
        "topOfMind": [{ "concepto": "", "volumen": 0 }],
        "territorial": [{ "region": "", "mencionPredominante": "" }]
      }`
    };

    const promptSeleccionado = systemPrompts[skillType] || systemPrompts.emociones;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini', // Puedes cambiar el modelo por el que uses en OpenRouter
        response_format: { type: 'json_object' }, // Forzar salida JSON
        messages: [
          { role: 'system', content: promptSeleccionado },
          { role: 'user', content: `Analiza esta información extraída: ${JSON.stringify(rawData).slice(0, 15000)}` }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const parsedData = JSON.parse(content);

    return res.json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('Error en OpenRouter Route:', error.message);
    return res.status(500).json({
      error: 'Error al estructurar los datos con OpenRouter.',
      message: error.response?.data || error.message
    });
  }
});

module.exports = router;
