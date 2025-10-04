const channels = new Map();

export function subscribe(channelId, onSend) {
  const key = String(channelId);
  if (!channels.has(key)) channels.set(key, new Set());
  const set = channels.get(key);
  set.add(onSend);
  return () => {
    set.delete(onSend);
    if (set.size === 0) channels.delete(key);
  };
}

export function publish(channelId, data) {
  const key = String(channelId);
  const set = channels.get(key);
  if (!set) return;
  for (const send of set) {
    try { send(data); } catch (_e) {}
  }
}


