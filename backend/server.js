require("dotenv").config();

// Import the tools used by the backend
const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const database = require("./database");

// Configure the Express server
const app = express();
const port = 3001;

// Create a folder for images downloaded from Pixabay
const uploadsDirectory = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDirectory, {
  recursive: true,
});

app.use(cors());
app.use(express.json());

// Make downloaded images available to the frontend
app.use("/uploads", express.static(uploadsDirectory));

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
    SELECT id, name, description, share_id AS shareId
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

// Create or return a permanent sharing ID for a collection
app.post("/api/collections/:collectionId/share", (request, response) => {
  const collectionId = Number(request.params.collectionId);
  const collection = collections.find((item) => item.id === collectionId);

  if (!collection) {
    return response.status(404).json({
      error: "Collection not found.",
    });
  }

  if (!collection.shareId) {
    collection.shareId = randomUUID();

    database
      .prepare("UPDATE collections SET share_id = ? WHERE id = ?")
      .run(collection.shareId, collectionId);
  }

  response.json({
    shareId: collection.shareId,
    shareUrl: `http://localhost:5173/share/${collection.shareId}`,
  });
});

// Find a collection using its public sharing ID
app.get("/api/shared/:shareId", (request, response) => {
  const collection = collections.find(
    (item) => item.shareId === request.params.shareId,
  );

  if (!collection) {
    return response.status(404).json({
      error: "Shared collection not found.",
    });
  }

  response.json(collection);
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

// Search Pixabay using private API key in .env
app.get("/api/search", async (request, response) => {
  const query = request.query.q?.trim();

  if (!query) {
    return response.status(400).json({
      error: "A search term is required.",
    });
  }

  if (query.length > 100) {
    return response.status(400).json({
      error: "Search terms cannot exceed 100 characters.",
    });
  }

  if (!process.env.PIXABAY_API_KEY) {
    return response.status(500).json({
      error: "Pixabay API key is not configured.",
    });
  }

  const parameters = new URLSearchParams({
    key: process.env.PIXABAY_API_KEY,
    q: query,
    image_type: "photo",
    safesearch: "true",
    per_page: "12",
  });

  try {
    const pixabayResponse = await fetch(
      `https://pixabay.com/api/?${parameters}`,
    );

    if (!pixabayResponse.ok) {
      throw new Error(`Pixabay returned status ${pixabayResponse.status}`);
    }

    const data = await pixabayResponse.json();

    const results = data.hits.map((image) => ({
      id: image.id,
      title: image.tags,
      previewUrl: image.webformatURL,
      sourceUrl: image.pageURL,
      creator: image.user,
    }));

    response.json(results);
  } catch (error) {
    console.error("Pixabay search failed:", error);

    response.status(502).json({
      error: "Could not search Pixabay.",
    });
  }
});

// Download a Pixabay image and save it to a collection
app.post(
  "/api/collections/:collectionId/pixabay-images",
  async (request, response) => {
    const collectionId = Number(request.params.collectionId);
    const collection = collections.find((item) => item.id === collectionId);

    if (!collection) {
      return response.status(404).json({
        error: "Collection not found.",
      });
    }

    const imageUrl = request.body.imageUrl?.trim();
    const title = request.body.title?.trim() || "Untitled image";

    if (!imageUrl) {
      return response.status(400).json({
        error: "Image URL is required.",
      });
    }

    let imageAddress;

    try {
      imageAddress = new URL(imageUrl);
    } catch {
      return response.status(400).json({
        error: "The image URL is invalid.",
      });
    }

    const isPixabayUrl =
      imageAddress.protocol === "https:" &&
      (imageAddress.hostname === "pixabay.com" ||
        imageAddress.hostname.endsWith(".pixabay.com"));

    if (!isPixabayUrl) {
      return response.status(400).json({
        error: "Only Pixabay images can use this route.",
      });
    }

    try {
      const imageResponse = await fetch(imageUrl);

      if (!imageResponse.ok) {
        throw new Error("Pixabay did not return the image.");
      }

      const contentType = imageResponse.headers
        .get("content-type")
        ?.split(";")[0];

      const extensions = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
      };

      const extension = extensions[contentType];

      if (!extension) {
        return response.status(400).json({
          error: "Pixabay returned an unsupported file type.",
        });
      }

      const filename = `${randomUUID()}${extension}`;
      const filePath = path.join(uploadsDirectory, filename);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      fs.writeFileSync(filePath, imageBuffer);

      const savedImageUrl = `${request.protocol}://${request.get(
        "host",
      )}/uploads/${filename}`;

      const result = database
        .prepare(
          `
          INSERT INTO images (collection_id, image_url, title)
          VALUES (?, ?, ?)
        `,
        )
        .run(collectionId, savedImageUrl, title);

      const newImage = {
        id: Number(result.lastInsertRowid),
        imageUrl: savedImageUrl,
        title,
      };

      collection.images.push(newImage);

      response.status(201).json(newImage);
    } catch (error) {
      console.error("Could not download Pixabay image:", error);

      response.status(502).json({
        error: "Could not download the Pixabay image.",
      });
    }
  },
);

// Delete an image from a collection and in the server
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
