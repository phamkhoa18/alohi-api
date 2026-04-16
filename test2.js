const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/alohi');
  const userA = await mongoose.connection.collection('users').findOne({});
  const userB = await mongoose.connection.collection('users').findOne({_id: { $ne: userA._id }});
  const token = jwt.sign({ userId: userA._id.toString(), deviceId: 'test' }, 'alohi_dev_access_secret_2026', { expiresIn: '15m' });
  
  const req = http.request({ 
      hostname: '127.0.0.1', port: 3000, path: '/api/conversations', method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  });
  
  req.on('response', res => { 
      let data = ''; 
      res.on('data', chunk => data += chunk); 
      res.on('end', () => console.log(data)); 
  });
  
  req.write(JSON.stringify({userId: userB._id.toString()})); 
  req.end();
  
  await new Promise(r=>setTimeout(r, 1000));
  mongoose.disconnect();
}
run();
