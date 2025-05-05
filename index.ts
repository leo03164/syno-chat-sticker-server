import { Elysia } from 'elysia';
import { stickerRoute } from './src/routes/sticker.route';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia();
app.use(stickerRoute);
app.use(cors());
app.use(swagger());

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});