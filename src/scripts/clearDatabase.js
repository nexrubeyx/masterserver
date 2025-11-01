import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function clearDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    for (const coll of collections) {
      await db.collection(coll.name).deleteMany({});
      console.log(`Apagados dados da coleção: ${coll.name}`);
    }
    console.log('Todos os dados da base foram apagados.');
  } catch (err) {
    console.error('Erro ao apagar dados:', err);
  } finally {
    await client.close();
  }
}

clearDatabase();
