import { useEffect, useState } from "react";
import "./App.css";

//Main javascript for website
function App() {
  // Connection to back end for Collection editing
  const [collections, setCollections] = useState([]);
  const [apiMessage, setApiMessage] = useState("Connecting to backend...");

  // Collection sharing
  const [sharedCollection, setSharedCollection] = useState(null);
  const [shareError, setShareError] = useState("");

  // Pixabay searching
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState("");

  // Collection selector
  const [selectedCollectionId, setSelectedCollectionId] = useState("");

  const shareId = window.location.pathname.startsWith("/share/")
    ? window.location.pathname.split("/")[2]
    : null;

  // Check the backend connection once the page first loads
  useEffect(() => {
    fetch("http://localhost:3001/api/health")
      .then((response) => response.json())
      .then((data) => setApiMessage(data.message))
      .catch(() => setApiMessage("Backend is not connected"));
  }, []);

  // Load the collection list from the backend
  useEffect(() => {
    fetch("http://localhost:3001/api/collections")
      .then((response) => response.json())
      .then((data) => setCollections(data))
      .catch((error) => console.error("Could not load collections:", error));
  }, []);

  // Load one public collection when the URL contains a sharing ID
  useEffect(() => {
    if (!shareId) {
      return;
    }

    fetch(`http://localhost:3001/api/shared/${shareId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Shared collection not found.");
        }

        return response.json();
      })
      .then((data) => setSharedCollection(data))
      .catch((error) => setShareError(error.message));
  }, [shareId]);

  // Ask the backend to create a collection, then display its response
  async function handleCreateCollection() {
    const name = window.prompt("What should this collection be called?");

    if (!name?.trim()) {
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("The backend could not create the collection.");
      }

      const newCollection = await response.json();

      setCollections([...collections, newCollection]);
    } catch (error) {
      console.error(error);
      window.alert("Something went wrong while creating the collection.");
    }
  }

  // Save an image from a selected collection using backend
  async function handleAddImage(collectionId) {
    const imageUrl = window.prompt("Paste an image URL:");

    if (!imageUrl?.trim()) {
      return;
    }

    const title = window.prompt("Give the image a title:") || "Untitled image";

    try {
      const response = await fetch(
        `http://localhost:3001/api/collections/${collectionId}/images`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: imageUrl.trim(),
            title: title.trim(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("The backend could not save the image.");
      }

      const newImage = await response.json();

      setCollections(
        collections.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                images: [...collection.images, newImage],
              }
            : collection,
        ),
      );
    } catch (error) {
      console.error(error);
      window.alert("Something went wrong while saving the image.");
    }
  }

  // Delete an image through the API, then remove it from the page
  async function handleRemoveImage(collectionId, imageId) {
    if (!window.confirm("Remove this image?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/collections/${collectionId}/images/${imageId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("The backend could not remove the image.");
      }

      setCollections((currentCollections) =>
        currentCollections.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                images: collection.images.filter(
                  (image) => image.id !== imageId,
                ),
              }
            : collection,
        ),
      );
    } catch (error) {
      console.error(error);
      window.alert("Could not remove the image.");
    }
  }

  // Edit an image title through the API
  async function handleEditImage(collectionId, image) {
    const title = window.prompt("Enter a new title:", image.title);

    if (!title?.trim() || title.trim() === image.title) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/collections/${collectionId}/images/${image.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: title.trim() }),
        },
      );

      if (!response.ok) {
        throw new Error("The backend could not edit the image.");
      }

      const updatedImage = await response.json();

      setCollections((currentCollections) =>
        currentCollections.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                images: collection.images.map((currentImage) =>
                  currentImage.id === image.id ? updatedImage : currentImage,
                ),
              }
            : collection,
        ),
      );
    } catch (error) {
      console.error(error);
      window.alert("Could not edit the image title.");
    }
  }

  // Retreive public link to a collection from backend
  async function handleShareCollection(collectionId) {
    try {
      const response = await fetch(
        `http://localhost:3001/api/collections/${collectionId}/share`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("The backend could not share the collection.");
      }

      const share = await response.json();

      window.prompt("Copy this sharing link:", share.shareUrl);
    } catch (error) {
      console.error(error);
      window.alert("Could not create a sharing link.");
    }
  }

  // Search Pixabay through the backend
  async function handleSearch(event) {
    event.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    setSearchMessage("Searching...");
    setSearchResults([]);

    try {
      const response = await fetch(
        `http://localhost:3001/api/search?q=${encodeURIComponent(
          searchQuery.trim(),
        )}`,
      );

      if (!response.ok) {
        throw new Error("The image search failed.");
      }

      const results = await response.json();

      setSearchResults(results);
      setSearchMessage(
        results.length === 0
          ? "No images found."
          : `${results.length} images found.`,
      );
    } catch (error) {
      console.error(error);
      setSearchMessage("Could not search for images.");
    }
  }

  // Save a Pixabay search result to the selected collection
  async function handleSaveSearchResult(image) {
    if (!selectedCollectionId) {
      window.alert("Choose a collection first.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/collections/${selectedCollectionId}/pixabay-images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: image.previewUrl,
            title: image.title,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Could not save the image.");
      }

      const newImage = await response.json();

      setCollections((currentCollections) =>
        currentCollections.map((collection) =>
          collection.id === Number(selectedCollectionId)
            ? { ...collection, images: [...collection.images, newImage] }
            : collection,
        ),
      );

      window.alert("Image saved!");
    } catch (error) {
      console.error(error);
      window.alert("Could not save this image.");
    }
  }

  // Render a separate read-only page when visiting a sharing URL
  if (shareId) {
    if (shareError) {
      return (
        <main className="app">
          <header>
            <h1>SuperImage</h1>
            <p>{shareError}</p>
            <a href="/">Return home</a>
          </header>
        </main>
      );
    }

    if (!sharedCollection) {
      return (
        <main className="app">
          <header>
            <h1>Loading shared collection...</h1>
          </header>
        </main>
      );
    }

    return (
      <main className="app">
        <header>
          <h1>{sharedCollection.name}</h1>
          <p>{sharedCollection.description}</p>
          <small>Shared with SuperImage</small>
        </header>

        <section className="collections">
          <div className="saved-images">
            {sharedCollection.images.length > 0 ? (
              sharedCollection.images.map((image) => (
                <figure className="saved-image" key={image.id}>
                  <img src={image.imageUrl} alt={image.title} />
                  <figcaption>{image.title}</figcaption>
                </figure>
              ))
            ) : (
              <p className="empty-message">No images saved yet.</p>
            )}
          </div>

          <p>
            <a href="/">Return to SuperImage</a>
          </p>
        </section>
      </main>
    );
  }

  // Main home page rendering
  return (
    <main className="app">
      <header>
        <h1>SuperImage</h1>
        <p>Discover, save, and organize images that inspire you.</p>
        <small>{apiMessage}</small>
      </header>

      <section className="image-search">
        <h2>Discover images</h2>

        <form onSubmit={handleSearch}>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search for mountains, animals, art..."
            aria-label="Search Pixabay"
          />
          <button type="submit">Search</button>
        </form>

        <label htmlFor="collection-select">Save search results to: </label>

        <select
          id="collection-select"
          value={selectedCollectionId}
          onChange={(event) => setSelectedCollectionId(event.target.value)}
        >
          <option value="">Choose a collection</option>

          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>

        {searchMessage && <p>{searchMessage}</p>}

        <div className="search-results">
          {searchResults.map((image) => (
            <article className="search-result" key={image.id}>
              <img src={image.previewUrl} alt={image.title} />
              <small>
                Photo by {image.creator} on{" "}
                <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                  Pixabay
                </a>
              </small>
              <button
                type="button"
                onClick={() => handleSaveSearchResult(image)}
              >
                Save to collection
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="collections">
        <div className="section-heading">
          <h2>Your collections</h2>
          <button type="button" onClick={handleCreateCollection}>
            New collection
          </button>
        </div>

        <div className="collection-grid">
          {collections.map((collection) => (
            <article className="collection-card" key={collection.id}>
              <h3>{collection.name}</h3>
              <p>{collection.description}</p>
              <button
                className="add-image-button"
                type="button"
                onClick={() => handleAddImage(collection.id)}
              >
                Add image
              </button>

              <button
                className="share-button"
                type="button"
                onClick={() => handleShareCollection(collection.id)}
              >
                Share collection
              </button>

              {collection.images?.length > 0 ? (
                <div className="saved-images">
                  {collection.images.map((image) => (
                    <figure className="saved-image" key={image.id}>
                      <img src={image.imageUrl} alt={image.title} />
                      <figcaption>{image.title}</figcaption>
                      <button
                        type="button"
                        onClick={() => handleEditImage(collection.id, image)}
                      >
                        Edit title
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveImage(collection.id, image.id)
                        }
                      >
                        Remove image
                      </button>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="empty-message">No images saved yet.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
