const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/apify/run
// Recibe: { actorId: "autor/actor-name", input: { ...parámetros } }
router.post('/run', async (req, res) => {
  try {
    const { actorId, input } = req.body;
    const APIFY_TOKEN = process.env.APIFY_TOKEN;

    if (!APIFY_TOKEN) {
      return res.status(500).json({ error: 'Falta la variable APIFY_TOKEN en el servidor.' });
    }

    if (!actorId) {
      return res.status(400).json({ error: 'Se requiere el actorId de Apify.' });
    }

    // Configuración con waitForFinish=120 para evitar el timeout prematuro
    const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}&waitForFinish=120`;

    const response = await axios.post(apifyUrl, input || {}, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 130000 // Timeout de HTTP en Node.js (130s)
    });

    const datasetId = response.data?.data?.defaultDatasetId;

    if (!datasetId) {
      return res.status(500).json({ 
        error: 'El actor no devolvió un Dataset válido.',
        details: response.data 
      });
    }

    // Obtener los datos scrapeados desde el dataset
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`;
    const datasetResponse = await axios.get(datasetUrl);

    return res.json({
      success: true,
      itemsCount: datasetResponse.data.length,
      data: datasetResponse.data
    });

  } catch (error) {
    console.error('Error en Apify Route:', error.message);
    return res.status(500).json({
      error: 'Error al ejecutar el scraping en Apify.',
      message: error.response?.data || error.message
    });
  }
});

module.exports = router;
