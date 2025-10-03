const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../db');

// POST /api/dispositivo/log - Registrar log do dispositivo
router.post('/log', async (req, res) => {
    try {
        const { 
            uuid, 
            imei, 
            nome_aparelho, 
            numero_chip,
            hora_celular, 
            hora_sistema,
            evento
        } = req.body;

        // Validação básica
        if (!uuid || !imei || !hora_celular || !hora_sistema) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: uuid, imei, hora_celular, hora_sistema'
            });
        }

        const pool = await getConnection();
        
        // Calcular diferença de tempo (em segundos)
        const horaCelular = new Date(hora_celular);
        const horaSistema = new Date(hora_sistema);
        const diferencaSegundos = Math.abs((horaCelular - horaSistema) / 1000);
        
        const query = `
            INSERT INTO LogsDispositivos 
            (uuid, imei, nome_aparelho, numero_chip, hora_celular, hora_sistema, diferenca_segundos, evento)
            VALUES 
            (@uuid, @imei, @nome_aparelho, @numero_chip, @hora_celular, @hora_sistema, @diferenca_segundos, @evento)
        `;

        await pool.request()
            .input('uuid', sql.VarChar(36), uuid)
            .input('imei', sql.VarChar(50), imei)
            .input('nome_aparelho', sql.VarChar(100), nome_aparelho)
            .input('numero_chip', sql.VarChar(20), numero_chip)
            .input('hora_celular', sql.DateTime, hora_celular)
            .input('hora_sistema', sql.DateTime, hora_sistema)
            .input('diferenca_segundos', sql.Int, diferencaSegundos)
            .input('evento', sql.VarChar(50), evento || 'MONITORAMENTO')
            .query(query);

        console.log(`Log registrado: ${uuid} - ${evento || 'MONITORAMENTO'} - Diferença: ${diferencaSegundos}s`);

        // Verificar se há suspeita de fraude (diferença maior que 60 segundos)
        const suspeita = diferencaSegundos > 60;

        res.json({
            success: true,
            message: 'Log registrado com sucesso',
            log_id: uuid,
            diferenca_segundos: diferencaSegundos,
            alerta_fraude: suspeita
        });

    } catch (error) {
        console.error('❌ Erro ao registrar log:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar log',
            error: error.message
        });
    }
});

// GET /api/dispositivo/historico/:imei - Buscar histórico de um dispositivo
router.get('/historico/:imei', async (req, res) => {
    try {
        const { imei } = req.params;
        const pool = await getConnection();
        
        const query = `
            SELECT TOP 100 * FROM LogsDispositivos 
            WHERE imei = @imei 
            ORDER BY created_at DESC
        `;

        const result = await pool.request()
            .input('imei', sql.VarChar(50), imei)
            .query(query);

        res.json({
            success: true,
            total: result.recordset.length,
            data: result.recordset
        });

    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar histórico',
            error: error.message
        });
    }
});

// GET /api/dispositivo/alertas - Buscar todos os alertas de fraude
router.get('/alertas', async (req, res) => {
    try {
        const pool = await getConnection();
        
        const query = `
            SELECT * FROM LogsDispositivos 
            WHERE evento = 'ALTERACAO_HORARIO' 
               OR diferenca_segundos > 60
            ORDER BY created_at DESC
        `;

        const result = await pool.request().query(query);

        res.json({
            success: true,
            total: result.recordset.length,
            data: result.recordset
        });

    } catch (error) {
        console.error('❌ Erro ao buscar alertas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar alertas',
            error: error.message
        });
    }
});

// GET /api/dispositivo/dispositivos - Listar todos os dispositivos monitorados
router.get('/dispositivos', async (req, res) => {
    try {
        const pool = await getConnection();
        
        const query = `
            SELECT 
                imei,
                nome_aparelho,
                numero_chip,
                COUNT(*) as total_logs,
                MAX(created_at) as ultimo_acesso,
                SUM(CASE WHEN evento = 'ALTERACAO_HORARIO' THEN 1 ELSE 0 END) as total_alertas
            FROM LogsDispositivos
            GROUP BY imei, nome_aparelho, numero_chip
            ORDER BY ultimo_acesso DESC
        `;

        const result = await pool.request().query(query);

        res.json({
            success: true,
            total: result.recordset.length,
            data: result.recordset
        });

    } catch (error) {
        console.error('❌ Erro ao listar dispositivos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar dispositivos',
            error: error.message
        });
    }
});

// DELETE /api/dispositivo/limpar/:imei - Limpar logs de um dispositivo
router.delete('/limpar/:imei', async (req, res) => {
    try {
        const { imei } = req.params;
        const pool = await getConnection();
        
        const query = `DELETE FROM LogsDispositivos WHERE imei = @imei`;

        const result = await pool.request()
            .input('imei', sql.VarChar(50), imei)
            .query(query);

        res.json({
            success: true,
            message: `${result.rowsAffected[0]} registros deletados`
        });

    } catch (error) {
        console.error('❌ Erro ao limpar logs:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao limpar logs',
            error: error.message
        });
    }
});

module.exports = router;