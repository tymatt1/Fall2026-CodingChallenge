import { useEffect, useState } from "react";
import "./App.css";

//Main javascript for website
function App() {
  const [collections, setCollections] = useState([]);
  const [apiMessage, setApiMessage] = useState("Connecting to backend...");

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

  return (
    <main className="app">
      <header>
        <h1>SuperImage</h1>
        <p>Discover, save, and organize images that inspire you.</p>
        <small>{apiMessage}</small>
      </header>

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

              {collection.images?.length > 0 ? (
                <div className="saved-images">
                  {collection.images.map((image) => (
                    <figure className="saved-image" key={image.id}>
                      <img src={image.imageUrl} alt={image.title} />
                      <figcaption>{image.title}</figcaption>
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
