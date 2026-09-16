// Configured Express backend server
const express = require('express')
const cors = require('cors')

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

// Temporary storage while the app is running.
let collections = [
  {
    id: 1,
    name: 'Dream Destinations',
    description: 'Places I would love to visit.',
    images: [],
  },
  {
    id: 2,
    name: 'Creative Spaces',
    description: 'Rooms and workspaces that inspire me.',
    images: [],
  },
]

// Return every collection to the frontend
app.get('/api/collections', (request, response) => {
  response.json(collections)
})

// Create a collection from data sent by the frontend
app.post('/api/collections', (request, response) => {
  const name = request.body.name?.trim()

  if (!name) {
    return response.status(400).json({
      error: 'Collection name is required.',
    })
  }

  const newCollection = {
    id: Date.now(),
    name,
    description:
      request.body.description?.trim() || 'A new SuperImage collection.',
    images: [],
  }

  collections.push(newCollection)

  response.status(201).json(newCollection)
})

// Save an image inside a certain collection
app.post('/api/collections/:collectionId/images', (request, response) => {
  const collectionId = Number(request.params.collectionId)
  const collection = collections.find((item) => item.id === collectionId)

  if (!collection) {
    return response.status(404).json({
      error: 'Collection not found.',
    })
  }

  const imageUrl = request.body.imageUrl?.trim()

  if (!imageUrl) {
    return response.status(400).json({
      error: 'Image URL is required.',
    })
  }

  const newImage = {
    id: Date.now(),
    imageUrl,
    title: request.body.title?.trim() || 'Untitled image',
  }

  collection.images.push(newImage)

  response.status(201).json(newImage)
})

// Verification that the backend is available
app.get('/api/health', (request, response) => {
  response.json({
    message: 'SuperImage API is running!',
  })
})

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`)
})