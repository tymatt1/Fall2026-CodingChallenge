// Configured Express backend server
const express = require("express");
const cors = require("cors");

const database = require("./database");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Verification that the backend is available
app.get("/api/health", (request, response) => {
  response.json({
    message: "SuperImage API is running!",
  });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});

// Load collections and their images from SQLite db when the server starts
const collectionRows = database
  .prepare(
    `
    SELECT id, name, description
    FROM collections
    ORDER BY id
  `,
  )
  .all();

const selectImages = database.prepare(`
  SELECT
    id,
    image_url AS imageUrl,
    title
  FROM images
  WHERE collection_id = ?
  ORDER BY id
`);

let collections = collectionRows.map((collection) => ({
  ...collection,
  images: selectImages.all(collection.id),
}));

// Return every collection to the frontend
app.get("/api/collections", (request, response) => {
  response.json(collections);
});

// Create a collection and save it permanently in SQLite database
app.post("/api/collections", (request, response) => {
  const name = request.body.name?.trim();

  if (!name) {
    return response.status(400).json({
      error: "Collection name is required.",
    });
  }

  const description =
    request.body.description?.trim() || "A new SuperImage collection.";

  const result = database
    .prepare(
      `
      INSERT INTO collections (name, description)
      VALUES (?, ?)
    `,
    )
    .run(name, description);

  const newCollection = {
    id: Number(result.lastInsertRowid),
    name,
    description,
    images: [],
  };

  collections.push(newCollection);

  response.status(201).json(newCollection);
});

// Save an image to a current collection in the SQL db
app.post("/api/collections/:collectionId/images", (request, response) => {
  const collectionId = Number(request.params.collectionId);
  const collection = collections.find((item) => item.id === collectionId);

  if (!collection) {
    return response.status(404).json({
      error: "Collection not found.",
    });
  }

  const imageUrl = request.body.imageUrl?.trim();

  if (!imageUrl) {
    return response.status(400).json({
      error: "Image URL is required.",
    });
  }

  const title = request.body.title?.trim() || "Untitled image";

  const result = database
    .prepare(
      `
      INSERT INTO images (collection_id, image_url, title)
      VALUES (?, ?, ?)
    `,
    )
    .run(collectionId, imageUrl, title);

  const newImage = {
    id: Number(result.lastInsertRowid),
    imageUrl,
    title,
  };

  collection.images.push(newImage);

  response.status(201).json(newImage);
});

// Update an image title in SQLite and in the current server data
app.patch(
  "/api/collections/:collectionId/images/:imageId",
  (request, response) => {
    const collectionId = Number(request.params.collectionId);
    const imageId = Number(request.params.imageId);
    const title = request.body.title?.trim();

    if (!title) {
      return response.status(400).json({ error: "Title is required." });
    }

    const collection = collections.find((item) => item.id === collectionId);
    const image = collection?.images.find((item) => item.id === imageId);

    if (!image) {
      return response.status(404).json({ error: "Image not found." });
    }

    database
      .prepare("UPDATE images SET title = ? WHERE id = ? AND collection_id = ?")
      .run(title, imageId, collectionId);

    image.title = title;
    response.json(image);
  },
);

// Delete an image from the SQLite server's collection data
app.delete(
  "/api/collections/:collectionId/images/:imageId",
  (request, response) => {
    const collectionId = Number(request.params.collectionId);
    const imageId = Number(request.params.imageId);

    const collection = collections.find((item) => item.id === collectionId);

    if (!collection) {
      return response.status(404).json({
        error: "Collection not found.",
      });
    }

    const image = collection.images.find((item) => item.id === imageId);

    if (!image) {
      return response.status(404).json({
        error: "Image not found.",
      });
    }

    const result = database
      .prepare(
        `
        DELETE FROM images
        WHERE id = ? AND collection_id = ?
      `,
      )
      .run(imageId, collectionId);

    if (result.changes === 0) {
      return response.status(404).json({
        error: "Image not found in the database.",
      });
    }

    collection.images = collection.images.filter((item) => item.id !== imageId);

    response.json(image);
  },
);
