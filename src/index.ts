import http from 'http';

const server = http.createServer((req: any, res: any) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Vite + Node.js + TypeScript!');
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
