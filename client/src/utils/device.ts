export function getDeviceId(): string {
  let id = localStorage.getItem('chat_device_id');
  if (!id) {
    // Verifica si crypto.randomUUID está disponible
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      // Polyfill manual (UUID v4 simplificado)
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem('chat_device_id', id);
  }
  return id;
}
