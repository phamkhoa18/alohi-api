const axios = require('axios');
async function run() {
  try {
    const res = await axios.post('http://127.0.0.1:3000/api/auth/login', {
      phone: '0987654321', // Replace with valid phone later or just fake a token
      password: 'password' // We will just insert a token we can grab from log
    });
  } catch(e) { }
}
run();
