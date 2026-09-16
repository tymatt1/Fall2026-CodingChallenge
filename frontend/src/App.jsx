import { useState } from 'react'
import './App.css'

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
  },
]

function App() {
  const [collections, setCollections] = useState(sampleCollections)

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