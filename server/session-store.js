import session from 'express-session';
import makeMemoryStore from 'memorystore';
const MemoryStore = makeMemoryStore(session);

// Anonymous CSRF sessions must never evict authenticated sessions.
export class PartitionedStore extends session.Store {
  constructor(ttl) {
    super();
    this.auth = new MemoryStore({ checkPeriod: 60_000, max: 128, ttl });
    this.pre = new MemoryStore({ checkPeriod: 60_000, max: 512, ttl });
  }
  get(id, callback) { this.auth.get(id, (error, value) => error || value ? callback(error, value) : this.pre.get(id, callback)); }
  set(id, value, callback) { (value.authenticated ? this.auth : this.pre).set(id, value, callback); }
  destroy(id, callback) { this.auth.destroy(id, error => error ? callback?.(error) : this.pre.destroy(id, callback)); }
  touch(id, value, callback) { (value.authenticated ? this.auth : this.pre).touch(id, value, callback); }
  stopInterval() { this.auth.stopInterval(); this.pre.stopInterval(); }
}
