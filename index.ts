import { Elysia } from 'elysia';
import { stickerRoute } from './src/routes/sticker.route';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { seriesRoute } from './src/routes/series.route';

const app = new Elysia();
app.use(stickerRoute);
app.use(seriesRoute);
app.use(cors());
app.use(swagger());

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});