const sql = require('mssql');

const config = {
    user: 'usuario',
    password: 'senha',
    server: 'IP_do_Servidor',
    database: 'MonitorDB',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};


let pool = null;

async function getConnection() {
    try {
        if (pool) {
            return pool;
        }
        pool = await sql.connect(config);
        console.log('Conectado ao SQL Server');
        return pool;
    } catch (err) {
        console.error('Erro ao conectar no SQL Server:', err);
        throw err;
    }
}

module.exports = {
    sql,
    getConnection
};