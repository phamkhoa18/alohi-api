/**
 * Fix ALL corrupted lastMessage data — handles multiple formats:
 * - String: "msg_xxx" → set to null
 * - ObjectId cast failures → set to null  
 */
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb://127.0.0.1:27017/alohi');
  
  const convos = await mongoose.connection.collection('conversations').find({}).toArray();
  let fixed = 0;
  
  for (const conv of convos) {
    // If lastMessage is a string (not null, not object)
    if (conv.lastMessage && typeof conv.lastMessage === 'string') {
      await mongoose.connection.collection('conversations').updateOne(
        { _id: conv._id },
        { $set: { lastMessage: null } }
      );
      console.log(`Fixed string lastMessage for ${conv._id}`);
      fixed++;
    }
    // If lastMessage is an object but _id is not a string
    else if (conv.lastMessage && typeof conv.lastMessage === 'object' && conv.lastMessage._id) {
      if (typeof conv.lastMessage._id !== 'string') {
        conv.lastMessage._id = conv.lastMessage._id.toString();
        await mongoose.connection.collection('conversations').updateOne(
          { _id: conv._id },
          { $set: { lastMessage: conv.lastMessage } }
        );
        console.log(`Fixed lastMessage._id type for ${conv._id}`);
        fixed++;
      }
    }
  }
  
  console.log(`Done! Fixed ${fixed} conversations out of ${convos.length} total`);
  await mongoose.disconnect();
}

fix().catch(console.error);
