import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../.env'); // set path or use env
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const dbFile = path.join(__dirname, '..', 'backend', 'db.json');
  const raw = fs.readFileSync(dbFile, 'utf8');
  const data = JSON.parse(raw);

  // Map legacy users -> new firebase uid
  const userMap: Record<string, string> = {};

  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      // Create auth user with temporary password (or skip creating auth if you will force reset)
      const created = await admin.auth().createUser({
        email: u.email,
        password: u.password || Math.random().toString(36).slice(-8),
        displayName: u.name || undefined
      });
      await db.collection('users').doc(created.uid).set({
        email: created.email,
        name: created.displayName || u.name || '',
        legacyId: u.id ?? null
      });
      userMap[String(u.id)] = created.uid;
      console.log(`migrated user legacyId=${u.id} -> uid=${created.uid}`);
    }
  }

  if (Array.isArray(data.transactions)) {
    for (const tx of data.transactions) {
      const uid = userMap[String(tx.userId)] ?? String(tx.userId);
      const doc = { ...tx, userId: uid };
      delete doc.id;
      await db.collection('transactions').add(doc);
    }
  }

  if (Array.isArray(data.goals)) {
    for (const g of data.goals) {
      const uid = userMap[String(g.userId)] ?? String(g.userId);
      const doc = { ...g, userId: uid };
      delete doc.id;
      await db.collection('goals').add(doc);
    }
  }

  console.log('Migration complete');
}

main().catch(e => { console.error(e); process.exit(1); });
