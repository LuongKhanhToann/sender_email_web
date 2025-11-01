import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const subject = formData.get('subject');
    const body = formData.get('body') ;
    const recipient = formData.get('recipient') ; // ✅ Chỉ nhận 1 email
    
    if (!recipient) {
      return NextResponse.json({ error: 'No recipient provided' }, { status: 400 });
    }

    // Setup OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      const message = createMessage(recipient, subject, body);
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: message },
      });
      
      return NextResponse.json({ 
        success: true,
        recipient: recipient 
      });
      
    } catch (error) {
      console.error(`Lỗi gửi tới ${recipient}:`, error.message);
      return NextResponse.json({ 
        error: error.message,
        recipient: recipient 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ Fix UTF-8 encoding cho tiêu đề
function createMessage(to, subject, body) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
  
  const boundary = '----=_Part_' + Date.now();
  
  const email = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    'This email requires HTML support.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
    '',
    `--${boundary}--`
  ].join('\r\n');
  
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}