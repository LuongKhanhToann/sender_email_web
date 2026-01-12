import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
      // ✅ Convert files sang base64
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
      
      // ✅ Đọc logo.jpeg và embed
      const logoPath = path.join(process.cwd(), 'public', 'logo.jpeg');
      let logoBase64 = null;
      
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
      }
      
      const message = createMessage(recipient, subject, body, attachments, logoBase64);
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

// ✅ Fix UTF-8 encoding + Support attachments + Embedded logo
function createMessage(to, subject, body, attachments = [], logoBase64 = null) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
  
  // ✅ Thay thế src="/logo.jpeg" bằng cid:logo nếu có logo
  let finalBody = body;
  if (logoBase64) {
    finalBody = body.replace(/src="\/logo\.jpeg"/g, 'src="cid:logo"');
  }
  
  // ✅ Nếu KHÔNG có attachments và KHÔNG có logo - giữ nguyên code cũ
  if (attachments.length === 0 && !logoBase64) {
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
      finalBody,
      '',
      `--${boundary}--`
    ].join('\r\n');
    
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  // ✅ Nếu CÓ attachments hoặc logo - dùng nested multipart
  const outerBoundary = '----=_Part_Outer_' + Date.now();
  const innerBoundary = '----=_Part_Inner_' + Date.now();
  const relatedBoundary = '----=_Part_Related_' + Date.now();
  
  const email = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${outerBoundary}"`,
    '',
    `--${outerBoundary}`,
  ];
  
  // ✅ Nếu có logo, dùng multipart/related để wrap HTML + logo
  if (logoBase64) {
    email.push(
      `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
      '',
      `--${relatedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${innerBoundary}"`,
      '',
      `--${innerBoundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      'This email requires HTML support.',
      '',
      `--${innerBoundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      finalBody,
      '',
      `--${innerBoundary}--`,
      '',
      // ✅ Embed logo với CID
      `--${relatedBoundary}`,
      'Content-Type: image/jpeg; name="logo.jpeg"',
      'Content-Transfer-Encoding: base64',
      'Content-ID: <logo>',
      'Content-Disposition: inline; filename="logo.jpeg"',
      '',
      logoBase64,
      '',
      `--${relatedBoundary}--`
    );
  } else {
    // Không có logo, chỉ dùng multipart/alternative
    email.push(
      `Content-Type: multipart/alternative; boundary="${innerBoundary}"`,
      '',
      `--${innerBoundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      'This email requires HTML support.',
      '',
      `--${innerBoundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      finalBody,
      '',
      `--${innerBoundary}--`
    );
  }
  
  // ✅ Thêm attachments
  attachments.forEach(({ filename, mimeType, data }) => {
    email.push(
      '',
      `--${outerBoundary}`,
      `Content-Type: ${mimeType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      data
    );
  });
  
  email.push('', `--${outerBoundary}--`);
  
  return Buffer.from(email.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}