require('dotenv').config();
const mongoose = require('mongoose');
const Conversation = require('./src/models/Conversation');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const doc = await Conversation.findById(undefined);
    console.log("Result:", doc);
  } catch (err) {
    console.log("Error type:", err.name);
    console.log("Error msg:", err.message);
  }
  process.exit();
}
test();
