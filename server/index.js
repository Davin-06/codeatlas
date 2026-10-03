import 'dotenv/config'
import { createApp } from './app.js'

const port = Number.parseInt(process.env.PORT, 10) || 8000
const { app } = await createApp()

app.listen(port, '0.0.0.0', () => {
  console.log(`CodeAtlas running at http://localhost:${port}`)
})
