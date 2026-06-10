import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function apiPlugin() {
    const dbPath = resolve(__dirname, '../data/geometry.db');
    const db = new Database(dbPath);

    // 初始化表
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '未命名项目',
            data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 预编译 SQL
    const stmts = {
        list: db.prepare('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC'),
        get: db.prepare('SELECT * FROM projects WHERE id = ?'),
        insert: db.prepare('INSERT INTO projects (name, data) VALUES (?, ?)'),
        update: db.prepare('UPDATE projects SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
        delete: db.prepare('DELETE FROM projects WHERE id = ?'),
    };

    return {
        name: 'vite-plugin-api',
        configureServer(server) {
            // 解析 JSON body
            server.middlewares.use('/api', async (req, res, next) => {
                if (req.method === 'POST' || req.method === 'PUT') {
                    const chunks = [];
                    for await (const chunk of req) chunks.push(chunk);
                    try {
                        req.body = JSON.parse(Buffer.concat(chunks).toString());
                    } catch (e) {
                        req.body = {};
                    }
                }
                next();
            });

            // GET /api/projects - 项目列表
            server.middlewares.use('/api/projects', (req, res) => {
                if (req.method === 'GET') {
                    const projects = stmts.list.all();
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(projects));
                }
            });

            // POST /api/projects - 创建项目
            server.middlewares.use('/api/projects', (req, res) => {
                if (req.method === 'POST') {
                    const { name, data } = req.body;
                    const result = stmts.insert.run(name || '未命名项目', JSON.stringify(data));
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ id: result.lastInsertRowid }));
                }
            });

            // GET /api/projects/:id - 获取单个项目
            server.middlewares.use('/api/projects/', (req, res) => {
                const id = req.url.split('/')[0];
                if (req.method === 'GET') {
                    const project = stmts.get.get(id);
                    if (project) {
                        project.data = JSON.parse(project.data);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(project));
                    } else {
                        res.statusCode = 404;
                        res.end(JSON.stringify({ error: '项目不存在' }));
                    }
                }
            });

            // PUT /api/projects/:id - 更新项目
            server.middlewares.use('/api/projects/', (req, res) => {
                const id = req.url.split('/')[0];
                if (req.method === 'PUT') {
                    const { name, data } = req.body;
                    stmts.update.run(name, JSON.stringify(data), id);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true }));
                }
            });

            // DELETE /api/projects/:id - 删除项目
            server.middlewares.use('/api/projects/', (req, res) => {
                const id = req.url.split('/')[0];
                if (req.method === 'DELETE') {
                    stmts.delete.run(id);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true }));
                }
            });
        }
    };
}
