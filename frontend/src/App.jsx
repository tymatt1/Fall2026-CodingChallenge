import { useEffect, useState } from "react";
import "./App.css";
import SearchResultCard from "./components/SearchResultCard";
import {
  addImage,
  createCollection,
  getCollections,
  getSharedCollection,
  removeImage,
  savePixabayImage,
  searchImages,
  shareCollection,
  updateImageTitle,
} from "./api";

//Main javascript for website
function App() {
  // Connection to back end for Collection editing
  const [collections, setCollections] = useState([]);

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

  // Load the collection list from the backend
  useEffect(() => {
    getCollections()
      .then((data) => setCollections(data))
      .catch((error) => console.error("Could not load collections:", error));
  }, []);

  // Load one public collection when the URL contains a sharing ID
  useEffect(() => {
    if (!shareId) {
      return;
    }

    getSharedCollection(shareId)
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
      const newCollection = await createCollection(name.trim());

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
      const newImage = await addImage(
        collectionId,
        imageUrl.trim(),
        title.trim(),
      );

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
      await removeImage(collectionId, imageId);

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
      const updatedImage = await updateImageTitle(
        collectionId,
        image.id,
        title.trim(),
      );

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
      const share = await shareCollection(collectionId);

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
      const results = await searchImages(searchQuery.trim());

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
      const newImage = await savePixabayImage(selectedCollectionId, image);

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
        <main className="app state-page">
          <header className="state-card">
            <span className="brand-mark">SI</span>
            <p className="eyebrow">SuperImage</p>
            <h1>We couldn&apos;t find that collection.</h1>
            <p>{shareError}</p>
            <a className="text-link" href="/">
              Return home
            </a>
          </header>
        </main>
      );
    }

    if (!sharedCollection) {
      return (
        <main className="app state-page">
          <header className="state-card">
            <span className="brand-mark">SI</span>
            <p className="eyebrow">SuperImage</p>
            <h1>Loading shared collection...</h1>
          </header>
        </main>
      );
    }

    return (
      <main className="app shared-page">
        <header className="shared-header">
          <div className="shared-header-content">
            <a className="brand" href="/">
              <span className="brand-mark">SI</span>
              <span>SuperImage</span>
            </a>
            <span className="shared-badge">Read-only collection</span>
            <h1>{sharedCollection.name}</h1>
            <p>{sharedCollection.description}</p>
          </div>
        </header>

        <section className="shared-content">
          <div className="shared-heading">
            <div>
              <p className="section-kicker">Curated with SuperImage</p>
              <h2>Collection gallery</h2>
            </div>
            <a className="text-link" href="/">
              Return to SuperImage
            </a>
          </div>

          <div className="shared-gallery">
            {sharedCollection.images.length > 0 ? (
              sharedCollection.images.map((image) => (
                <figure className="saved-image" key={image.id}>
                  <div className="image-frame">
                    <img src={image.imageUrl} alt={image.title} />
                  </div>
                  <figcaption>{image.title}</figcaption>
                </figure>
              ))
            ) : (
              <p className="empty-message">No images saved yet.</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  // Main home page rendering
  return (
    <main className="app">
      <header className="app-header">
        <div className="header-content">
          <a className="brand" href="/">
            <span className="brand-mark">SI</span>
            <span>SuperImage</span>
          </a>
        </div>
      </header>

      <div className="app-content">
        <section className="page-intro">
          <div>
            <h1>SuperImage</h1>
            <p>
              Search, organize, and share the images that support your ideas.
            </p>
          </div>

          <button type="button" onClick={handleCreateCollection}>
            + New collection
          </button>
        </section>

        <section className="image-search">
          <div className="search-heading">
            <div>
              <p className="section-kicker">Explore</p>
              <h2>Discover images</h2>
            </div>

            <div className="destination-picker">
              <label htmlFor="collection-select">Save results to</label>

              <select
                id="collection-select"
                value={selectedCollectionId}
                onChange={(event) =>
                  setSelectedCollectionId(event.target.value)
                }
              >
                <option value="">Choose a collection</option>

                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Try ‘coastal architecture’ or ‘wildflowers’"
              aria-label="Search Pixabay"
            />
            <button type="submit">Search Pixabay</button>
          </form>

          {searchMessage && <p className="search-message">{searchMessage}</p>}

          <div className="search-results">
            {searchResults.map((image) => (
              <SearchResultCard
                key={image.id}
                image={image}
                onSave={handleSaveSearchResult}
              />
            ))}
          </div>
        </section>

        <section className="collections">
          <div className="section-heading">
            <div>
              <h2>Your collections</h2>
              <p className="section-description">
                {collections.length} curated spaces for your inspiration
              </p>
            </div>
          </div>

          <div className="collection-grid">
            {collections.map((collection) => (
              <article className="collection-card" key={collection.id}>
                <div className="collection-card-header">
                  <div>
                    <span className="collection-label">Collection</span>
                    <h3>{collection.name}</h3>
                    <p>{collection.description}</p>
                  </div>
                  <span className="image-count">
                    {collection.images?.length || 0} saved
                  </span>
                </div>

                <div className="collection-actions">
                  <button
                    className="add-image-button"
                    type="button"
                    onClick={() => handleAddImage(collection.id)}
                  >
                    + Add image
                  </button>

                  <button
                    className="share-button"
                    type="button"
                    onClick={() => handleShareCollection(collection.id)}
                  >
                    Share collection
                  </button>
                </div>

                {collection.images?.length > 0 ? (
                  <div className="saved-images">
                    {collection.images.map((image) => (
                      <figure className="saved-image" key={image.id}>
                        <div className="image-frame">
                          <img src={image.imageUrl} alt={image.title} />
                        </div>
                        <figcaption title={image.title}>
                          {image.title}
                        </figcaption>
                        <div className="image-actions">
                          <button
                            type="button"
                            onClick={() =>
                              handleEditImage(collection.id, image)
                            }
                          >
                            Edit title
                          </button>
                          <button
                            className="remove-button"
                            type="button"
                            onClick={() =>
                              handleRemoveImage(collection.id, image.id)
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <div className="empty-message">
                    <span>+</span>
                    <p>No images yet. Add one to start this collection.</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
