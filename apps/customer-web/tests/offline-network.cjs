const net = require('node:net');
const installed = Symbol.for('rhc.frontend.offline-network');
if (!net.Socket.prototype[installed]) {
  const connect = net.Socket.prototype.connect;
  const loopback = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  net.Socket.prototype.connect = function (...args) {
    const values = Array.isArray(args[0]) ? args[0] : args;
    const options = typeof values[0] === 'object' && values[0] !== null ? values[0] : {};
    const host = options.host || (typeof values[1] === 'string' ? values[1] : 'localhost');
    if (!options.path && !loopback.has(String(host).toLowerCase())) {
      throw new Error('FRONTEND_OFFLINE: non-loopback socket blocked');
    }
    return connect.apply(this, args);
  };
  net.Socket.prototype[installed] = true;
}
