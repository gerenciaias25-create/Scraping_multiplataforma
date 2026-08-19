const axios = require('axios');

// Definición centralizada de Prompts según la Skill elegida
const PROMPTS_POR_SKILL = {
  emociones: `Eres un analista de datos avanzado. Analiza el contenido suministrado y genera un informe en formato JSON estricto.
  Estructura esperada:
  {
    "territory": "Nombre o tema principal del análisis",
    "emotions": {
      "ira": 0,
      "miedo": 0,
      "anticipacion": 0,
      "tristeza": 0,
      "asco": 0,
      "alegria": 0,
      "confianza": 0,
      "sorpresa": 0
    },
    "dyads": [
      { "nombre": "Combinación de emoción", "valor": 0 }
    ],
    "partidos": [
      { "nombre": "Partido/Grupo", "menciones": 0 }
    ],
    "actores": [
      { "nombre": "Mención clave", "impacto": "Positivo|Negativo|Neutro" }
    ]
  }
  Nota: Las 8 emociones de "emotions" deben ser valores numéricos enteros del 0 al 100 que sumen 100.`,

  opositor: `Eres un estratega político senior. Procesa la información e identifica vulnerabilidades y líneas de ataque.
  Estructura esperada:
  {
    "candidato": "Nombre del opositor analizado",
    "vulnerabilidades": [
      { "categoria": "Categoría clave", "nivel": "Alto|Medio|Bajo", "descripcion": "Resumen breve" }
    ],
    "contradicciones": [
      { "tema": "Tema o postura", "citaOposicion": "Lo que dijo antes", "realidad": "Hecho actual" }
    ],
    "vectoresAtaque": [
      { "eje": "Eje de ataque", "impacto": "Alto|Medio|Bajo", "narrativaRecomendada": "Estrategia sugerida" }
    ]
  }`,

  bivariado: `Eres un experto en ciencia de datos e investigación cualitativa. Clasifica y cruza el texto recibido.
  Estructura esperada:
  {
    "sentimiento": {
      "positivo": 0,
      "neutro": 0,
      "negativo": 0
    },
    "topOfMind": [
      { "concepto": "Término o tema", "volumen": 0 }
    ],
    "territorial": [
      { "region": "Región o zona", "mencionPredominante": "Tendencia observada" }
    ]
  }
  Nota: En "sentimiento", los valores deben ser porcentajes que sumen 100.`
};

/**
 * Procesa los datos scrapeados usando OpenRouter y retorna un JSON validado.
 * @param {string} skillType - "emociones" | "opositor" | "bivariado"
 * @param {Array|Object} rawData - Datos extraídos por Apify
 * @param {string} [model="openai/gpt-4o-mini"] - Modelo a utilizar en OpenRouter
 * @returns {Promise<Object>} Objeto JSON con la estructura adaptada a la plantilla
 */
async function estructurarConOpenRouter(skillType, rawData, model = 'openai/gpt-4o-mini') {
  const token = process.env.OPENROUTER_KEY;

  if (!token) {
    throw new Error('OPENROUTER_KEY no está configurada en las variables de entorno.');
  }

  const systemPrompt = PROMPTS_POR_SKILL[skillType] || PROMPTS_POR_SKILL.emociones;
  
  // Truncar el texto de entrada si es demasiado largo para prevenir exceso de consumo de tokens
  const payloadTexto = JSON.stringify(rawData).slice(0, 20000);

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analiza este conjunto de datos:\n${payloadTexto}` }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const rawJsonString = response.data.choices[0]?.message?.content;

    if (!rawJsonString) {
      throw new Error('OpenRouter devolvió una respuesta vacía.');
    }

    // Parsear string a objeto JSON para consumo del frontend
    return JSON.parse(rawJsonString);

  } catch (error) {
    const mensajeError = error.response?.data?.error?.message || error.message;
    throw new Error(`Error en el servicio de OpenRouter: ${mensajeError}`);
  }
}

module.exports = {
  estructurarConOpenRouter
};
