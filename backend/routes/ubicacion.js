const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');

router.get('/regiones', ubicacionController.obtenerRegiones);
router.get('/comunas/region/:regionId', ubicacionController.obtenerComunasPorRegion);
router.get('/comunas', ubicacionController.obtenerTodasLasComunas);

module.exports = router;