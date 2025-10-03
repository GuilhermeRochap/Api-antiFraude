const express = require('express');
const cors = require('cors');
const dispositivoRoutes = require('./routes/dispositivo'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requests no console
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rotas principais
app.use('/api/dispositivo', dispositivoRoutes);

// Endpoint raiz para teste
app.get('/', (req, res) => {
    res.json({
        message: 'API de Monitoramento de Dispositivos rodando!',
        status: 'online',
        version: '1.0.0',
        endpoints: {
            "POST /api/dispositivo/log": "Registrar log do dispositivo",
            "GET /api/dispositivo/historico/:imei": "Buscar histórico por IMEI",
            "GET /api/dispositivo/alertas": "Buscar alertas de fraude",
            "GET /api/dispositivo/dispositivos": "Listar dispositivos monitorados",
            "DELETE /api/dispositivo/limpar/:imei": "Apagar logs de um dispositivo" // ESSE É TEMPORARIO
        }
    });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint não encontrado"
    });
});

// Start do servidor
app.listen(PORT, () => {
    console.log(` Servidor rodando na porta ${PORT}`);
    console.log(` Acesse: http://localhost:${PORT}`);
});