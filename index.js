import mysql2 from 'mysql2/promise';
import http from 'http';
import fs from 'fs';
import path from 'path';

const pool = mysql2.createPool({
    host: 'localhost',
    database: 'miniproyecto',
    user: 'root',
    password: ''
});

const server = http.createServer(async (request, response) => {
    const url = request.url;
    const method = request.method;

    if (method === 'GET') {
        if (url === '/') {
            fs.readFile('index.html', (error, data) => {
                if (error) {
                    response.writeHead(500, { 'Content-Type': 'text/plain' });
                    response.end('Error interno del servidor');
                } else {
                    response.writeHead(200, { 'Content-Type': 'text/html' });
                    response.end(data);
                }
            });
        } else if (url === '/api/usuarios') {
            try {
                const resultado = await pool.query('SELECT * FROM usuarios');
                const data = resultado[0];
                const string = JSON.stringify(data);
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(string);
            } catch (error) {
                console.error('Error al consultar la base de datos:', error);
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Error interno del servidor');
            }
        } else if (url === '/api/usuarios/export') {
            try {
                const resultado = await pool.query('SELECT * FROM usuarios');
                const usuarios = resultado[0];
                const csvData = usuarios.map(usuario => Object.values(usuario).join(',')).join('\n');
                fs.writeFileSync('usuarios.csv', csvData);
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ message: 'Usuarios exportados' }));
            } catch (error) {
                console.error('Error al exportar usuarios:', error);
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Error interno del servidor');
            }
        } else if (url === '/api/usuarios/import') {
            const ruta = path.resolve('usuarios.csv');
            try {
                const contenido = await fs.promises.readFile(ruta, 'utf-8');
                const filas = contenido.split('\n').filter(row => row.trim() !== '');
                for (const row of filas) {
                    const columns = row.split(',');
                    const correo = columns[4];
                    if (!correo.includes('@')) {
                        console.log('Correo no válido, la fila no se insertó:', row);
                        continue;
                    }
                    try {
                        await pool.execute(
                            'INSERT INTO usuarios(id, nombre, apellido, direccion, correo, dni, edad, fecha_creacion, telefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            columns
                        );
                    } catch (error) {
                        console.error('No se insertó la fila:', row);
                    }
                }
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ message: 'Usuarios insertados' }));
            } catch (error) {
                console.error('Error al importar usuarios:', error);
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Error interno del servidor');
            }
        } else {
            response.end('No encontró la ruta');
        }
    }
});

server.listen(5500, () => console.log('Servidor ejecutándose en http://localhost:5500'));