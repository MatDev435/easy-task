import 'dotenv/config';

import fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';

import { authRoutes } from './routes/auth';
import { groupRoutes } from './routes/group';
import { taskRoutes } from './routes/task';

const app = fastify();

app.register(cors, {
    origin: true
})

app.register(jwt, {
    secret: 'açsldckjasdflçkuAÇuopiyqwerjlçEmasdclkEFm125asdçcEASDClkmasdfpoq82734opiasdfnlçkmadschg'
})

app.register(authRoutes);
app.register(groupRoutes);
app.register(taskRoutes);

app.listen({ port: 3333 }).then(() => {
    console.log('🚀 HTTP server running on http://localhost:3333')
})