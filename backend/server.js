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
  },
  {
    id: 2,
    name: 'Creative Spaces',
    description: 'Rooms and workspaces that inspire me.',
  },
]

// Return every collection to the frontend
app.get('/api/collections', (request, response) => {
  response.json(collections)
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