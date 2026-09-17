const API_BASE_URL = "http://localhost:3001";

// Send a request and convert the JSON response into JavaScript data
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "The request failed.");
  }

  return response.json();
}

export async function getHealth() {
  return request("/api/health");
}

export async function getCollections() {
  return request("/api/collections");
}

export async function getSharedCollection(shareId) {
  return request(`/api/shared/${encodeURIComponent(shareId)}`);
}

export async function createCollection(name) {
  return request("/api/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}

export async function addImage(collectionId, imageUrl, title) {
  return request(`/api/collections/${collectionId}/images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl, title }),
  });
}

export async function updateImageTitle(collectionId, imageId, title) {
  return request(`/api/collections/${collectionId}/images/${imageId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
}

export async function removeImage(collectionId, imageId) {
  return request(`/api/collections/${collectionId}/images/${imageId}`, {
    method: "DELETE",
  });
}

export async function shareCollection(collectionId) {
  return request(`/api/collections/${collectionId}/share`, {
    method: "POST",
  });
}

export async function searchImages(query) {
  return request(`/api/search?q=${encodeURIComponent(query)}`);
}

export async function savePixabayImage(collectionId, image) {
  return request(`/api/collections/${collectionId}/pixabay-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl: image.previewUrl,
      title: image.title,
    }),
  });
}
