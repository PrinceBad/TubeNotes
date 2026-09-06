import app from './api/index.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[Server] YouTube-to-PDF backend running on http://localhost:${PORT}`);
});
