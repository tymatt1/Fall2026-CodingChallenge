import { useEffect, useState } from 'react'
import './App.css'

// Temporary front-end data
const sampleCollections = [
  {
    id: 1,
    name: 'Dream Destinations',
    description: 'Places I would love to visit.',
  },
  {
    id: 2,
    name: 'Creative Spaces',
    description: 'Rooms and workspaces that inspire me.',
  },
  {
    id: 3,
    name: 'Recipe Ideas',
    description: 'Meals I want to try making.',
  }
]

//Main javascript for website
function App() {
  const [collections, setCollections] = useState(sampleCollections)
  const [apiMessage, setApiMessage] = useState('Connecting to backend...')

  // Check the backend connection once the page first loads
  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then((response) => response.json())
      .then((data) => setApiMessage(data.message))
      .catch(() => setApiMessage('Backend is not connected'))
  }, [])

  //Add a collection to React state. It will disappear when the Page refreshes.
  function handleCreateCollection() {
    const name = window.prompt('What should this collection be called?')

    if (!name?.trim()) {
      return
    }

    const newCollection = {
      id: Date.now(),
      name: name.trim(),
      description: 'A new SuperImage collection.',
    }

    setCollections([...collections, newCollection])
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
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App