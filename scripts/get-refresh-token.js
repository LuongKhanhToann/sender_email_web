const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');

// Đọc credentials từ file
const credentials = JSON.parse(fs.readFileSync('credentials.json')).installed;

const oAuth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uris[0]
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Tạo URL authorize
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('\n🔗 Bước 1: Mở link này trong trình duyệt:\n');
console.log(authUrl);
console.log('\n📝 Bước 2: Đăng nhập Gmail và cho phép quyền truy cập');
console.log('📋 Bước 3: Copy code từ URL và paste vào đây\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Nhập authorization code: ', (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('❌ Lỗi:', err);
      return;
    }
    
    // Lưu token
    fs.writeFileSync('token.json', JSON.stringify(token, null, 2));
    console.log('\n✅ Đã lưu token vào file token.json');
    console.log('📋 Refresh token:', token.refresh_token);
  });
});