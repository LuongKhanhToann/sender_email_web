import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const subject = formData.get('subject');
    const body = formData.get('body');
    const recipient = formData.get('recipient');
    
    // ✅ Lấy tất cả files
    const files = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'attachments' && value instanceof File) {
        files.push(value);
      }
    }

    if (!recipient || !subject || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // ✅ Convert files to base64
    const attachments = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return {
          filename: file.name,
          mimeType: file.type,
          data: buffer.toString('base64')
        };
      })
    );

    const message = createMessage(recipient, subject, body, attachments);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: message },
    });
    
    return NextResponse.json({ 
      success: true,
      recipient,
      attachments: attachments.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function createMessage(to, subject, body, attachments = []) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const boundary = '----=_Part_' + Date.now();
  
  const parts = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
    ''
  ];

  // ✅ Attach files
  attachments.forEach(({ filename, mimeType, data }) => {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${mimeType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      data,
      ''
    );
  });

  parts.push(`--${boundary}--`);

  return Buffer.from(parts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}