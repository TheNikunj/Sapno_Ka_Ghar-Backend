require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    try {
      await mongoose.connection.collection('users').dropIndex('username_1');
      console.log('Successfully dropped stale username_1 index');
    } catch(err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Index already dropped or not found');
      } else {
        console.log('Error dropping index:', err.message);
      }
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });
