// utils/model.js

const path = require('path');

// 🔍 Ruta absoluta a la carpeta raíz del proyecto
const ROOT_PATH = path.resolve(__dirname, '..'); // sube desde /utils a la raíz

/**
 * Carga un modelo desde la carpeta "models"
 * @param {string} name - Nombre del modelo (sin extensión)
 * @returns {any} Módulo requerido
 */
function model(name) {
  return require(path.join(ROOT_PATH, 'models', name));
}

module.exports = {
  model,
};
