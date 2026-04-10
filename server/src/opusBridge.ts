import express, { Request, Response } from 'express';

const app = express();

app.get('/opus/version', (req: Request, res: Response) => {
  res.json({
    version: "opus-bridge-v4",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/opus-status', (req: Request, res: Response) => {
  // existing status endpoint
});

export default app;
