const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "superimage.db");
const database = new Database(databasePath);

// Deleting a collection also deletes its saved images
database.pragma("foreign_keys = ON");

database.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    share_id TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled image',
    FOREIGN KEY (collection_id)
      REFERENCES collections(id)
      ON DELETE CASCADE
  );
`);

// Add share_id to databases created before sharing was implemented
const collectionColumns = database
  .prepare("PRAGMA table_info(collections)")
  .all();

const hasShareId = collectionColumns.some(
  (column) => column.name === "share_id",
);

if (!hasShareId) {
  database.exec("ALTER TABLE collections ADD COLUMN share_id TEXT");
}

// Add starter collections only when the database is completely empty
const collectionCount = database
  .prepare("SELECT COUNT(*) AS count FROM collections")
  .get();

if (collectionCount.count === 0) {
  const insertCollection = database.prepare(`
    INSERT INTO collections (name, description)
    VALUES (?, ?)
  `);

  insertCollection.run("Travel", "Places to explore and adventures to plan.");

  insertCollection.run(
    "Lifestyle",
    "Ideas for spaces, routines, and everyday inspiration.",
  );
}

module.exports = database;
