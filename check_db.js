import Database from 'better-sqlite3';
const db = new Database('./mango-bliss.db');
const latestOrder = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC LIMIT 1').get();
console.log(JSON.stringify(latestOrder, null, 2));
db.close();
