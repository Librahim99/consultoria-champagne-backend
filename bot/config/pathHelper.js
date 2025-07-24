const path = require('path');

// Ruta absoluta a la carpeta raíz del proyecto
const ROOT_PATH = path.resolve(__dirname, '../../');

function model(name) {
  return require(path.join(ROOT_PATH, 'models', name));
}

module.exports = {
  model,
};
