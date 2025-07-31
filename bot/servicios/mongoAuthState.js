const AuthState = require('../../models/AuthState');
const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');

async function useMongoAuthState(sessionId) {
  if (!sessionId) throw new Error('sessionId es requerido');

  const writeData = async (data, key) => {
    await AuthState.findOneAndUpdate(
      { sessionId, key },
      { value: JSON.stringify(data, BufferJSON.replacer) },
      { upsert: true }
    );
  };

  const readData = async (key) => {
    const doc = await AuthState.findOne({ sessionId, key });
    if (!doc) return null;
    try {
      return JSON.parse(doc.value, BufferJSON.reviver);
    } catch (err) {
      console.error(`❌ Error parseando data para ${sessionId}/${key}:`, err);
      return null;
    }
  };

  const removeData = async (key) => {
    await AuthState.deleteOne({ sessionId, key });
  };

  let creds = await readData('creds');
  if (!creds) {
    creds = initAuthCreds();
    await writeData(creds, 'creds');
  }

  const keys = {
    get: async (type, ids) => {
      const data = {};
      for (const id of ids) {
        let value = await readData(`${type}-${id}`);
        if (type === 'app-state-sync-key' && value) {
          value = proto.AppStateSyncKeyData.fromObject(value);
        }
        data[id] = value;
      }
      return data;
    },
    set: async (data) => {
      const tasks = [];
      for (const category in data) {
        for (const id in data[category]) {
          const value = data[category][id];
          const key = `${category}-${id}`;
          tasks.push(value ? writeData(value, key) : removeData(key));
        }
      }
      await Promise.all(tasks);
    }
  };

  const saveCreds = async () => {
    await writeData(creds, 'creds');
  };

  return {
    state: {
      creds,
      keys
    },
    saveCreds
  };
}

module.exports = useMongoAuthState;