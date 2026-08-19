const axios = require('axios');

/**
 * Ejecuta un Actor de Apify y recupera sus resultados.
 * @param {string} actorId - ID o nombre del actor (ej: "apify/instagram-scraper")
 * @param {object} input - Parámetros de entrada para el actor
 * @returns {Promise<Array>} Lista de items obtenidos en el dataset
 */
async function ejecutarScraping(actorId, input = {}) {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    throw new Error('APIFY_TOKEN no está configurada en las variables de entorno.');
  }

  // Configuración con waitForFinish=120 para evitar timeouts
  const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}&waitForFinish=120`;

  try {
    const response = await axios.post(apifyUrl, input, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 130000 // 130 segundos en Axios para no abortar antes que Apify
    });

    const datasetId = response.data?.data?.defaultDatasetId;

    if (!datasetId) {
      throw new Error('La ejecución finalizó pero no devolvió un Dataset válido.');
    }

    // Obtener los resultados del dataset generado
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
    const datasetResponse = await axios.get(datasetUrl);

    return datasetResponse.data;
  } catch (error) {
    const mensajeError = error.response?.data?.error?.message || error.message;
    throw new Error(`Error en el servicio de Apify: ${mensajeError}`);
  }
}

module.exports = {
  ejecutarScraping
};
