-- Criar banco de dados
CREATE DATABASE MonitorDB;
GO

USE MonitorDB;
GO

-- Tabela de logs de dispositivos
CREATE TABLE LogsDispositivos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    imei VARCHAR(50) NOT NULL,
    nome_aparelho VARCHAR(100),
    numero_chip VARCHAR(20),
    hora_celular DATETIME NOT NULL,
    hora_sistema DATETIME NOT NULL,
    diferenca_segundos INT,
    evento VARCHAR(50) DEFAULT 'MONITORAMENTO',
    created_at DATETIME DEFAULT GETDATE(),
    INDEX idx_imei (imei),
    INDEX idx_evento (evento),
    INDEX idx_created_at (created_at)
);
GO

-- View para análise de fraudes
CREATE VIEW vw_AlertasFraude AS
SELECT 
    id,
    uuid,
    imei,
    nome_aparelho,
    numero_chip,
    hora_celular,
    hora_sistema,
    diferenca_segundos,
    evento,
    created_at,
    CASE 
        WHEN diferenca_segundos > 300 THEN 'CRITICO'
        WHEN diferenca_segundos > 60 THEN 'ALTO'
        WHEN diferenca_segundos > 30 THEN 'MEDIO'
        ELSE 'BAIXO'
    END AS nivel_alerta
FROM LogsDispositivos
WHERE evento = 'ALTERACAO_HORARIO' 
   OR diferenca_segundos > 30;
GO

-- Procedure para relatório de dispositivos suspeitos
CREATE PROCEDURE sp_DispositivosSuspeitos
    @dias INT = 7
AS
BEGIN
    SELECT 
        imei,
        nome_aparelho,
        numero_chip,
        COUNT(*) as total_alertas,
        MAX(created_at) as ultimo_alerta,
        AVG(diferenca_segundos) as media_diferenca
    FROM LogsDispositivos
    WHERE created_at >= DATEADD(DAY, -@dias, GETDATE())
      AND (evento = 'ALTERACAO_HORARIO' OR diferenca_segundos > 60)
    GROUP BY imei, nome_aparelho, numero_chip
    HAVING COUNT(*) > 3
    ORDER BY total_alertas DESC;
END;
GO

-- Trigger para log de alterações críticas
CREATE TRIGGER trg_AlertaCritico
ON LogsDispositivos
AFTER INSERT
AS
BEGIN
    DECLARE @diferenca INT;
    DECLARE @imei VARCHAR(50);
    DECLARE @evento VARCHAR(50);
    
    SELECT @diferenca = diferenca_segundos, @imei = imei, @evento = evento
    FROM inserted;
    
    IF @diferenca > 300 OR @evento = 'ALTERACAO_HORARIO'
    BEGIN
        PRINT '🚨 ALERTA CRÍTICO: IMEI ' + @imei + ' - Diferença: ' + CAST(@diferenca AS VARCHAR) + 's';
        -- Aqui você pode adicionar lógica para enviar email, SMS, etc.
    END
END;
GO