import { createServer, type Server } from 'node:net';

// Servidor local que imita a PostgreSQL lo justo para que pg abra la conexión y confirme el BEGIN,
// y la corta en la siguiente sentencia: una conexión perdida en plena transacción.
const message = (type: string, body: Buffer) => {
  const header = Buffer.alloc(5);
  header.write(type, 0, 'ascii');
  header.writeInt32BE(body.length + 4, 1);
  return Buffer.concat([header, body]);
};
const authenticationOk = message('R', Buffer.from([0, 0, 0, 0]));
const readyForQuery = (status: 'I' | 'T') => message('Z', Buffer.from(status, 'ascii'));
const beginComplete = message('C', Buffer.from('BEGIN\0', 'ascii'));

export async function startDroppingPostgres(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const server: Server = createServer((socket) => {
    let started = false;
    socket.on('data', (data) => {
      if (!started) {
        started = true;
        socket.write(Buffer.concat([authenticationOk, readyForQuery('I')]));
      } else if (data.toString('latin1').includes('BEGIN')) {
        socket.write(Buffer.concat([beginComplete, readyForQuery('T')]));
      } else socket.destroy();
    });
    socket.on('error', () => {});
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  return {
    url: `postgresql://kofi@127.0.0.1:${port}/kofi`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
