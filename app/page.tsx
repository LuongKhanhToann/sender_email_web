"use client";

import React, { useState, ChangeEvent } from "react";
import {
  Mail,
  Paperclip,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";

// ==============================
// 🔹 Interface & Type Definitions
// ==============================

interface SendResults {
  success: number;
  total: number;
  failed: string[];
}

type Status = "ready" | "sending" | "success" | "error";

// ==============================
// 🔹 Component
// ==============================

export default function GmailSenderApp(): JSX.Element {
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [recipients, setRecipients] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [progress, setProgress] = useState<string>("");
  const [results, setResults] = useState<SendResults | null>(null);

  // ==============================
  // 🔹 Handlers
  // ==============================

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number): void => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = (): void => {
    if (confirm("Bạn có chắc muốn xóa hết?")) {
      setSubject("");
      setBody("");
      setRecipients("");
      setAttachments([]);
      setResults(null);
      setProgress("");
      setStatus("ready");
    }
  };

  const sendEmails = async (): Promise<void> => {
    if (!subject || !body || !recipients) {
      alert("⚠️ Vui lòng nhập đủ tiêu đề, nội dung và danh sách email!");
      return;
    }

    const recipientList = recipients
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.includes("@"));

    if (recipientList.length === 0) {
      alert("❌ Không có email hợp lệ!");
      return;
    }

    // Tính thời gian ước tính
    const estimatedMinutes = recipientList.length;
    const estimatedTime = estimatedMinutes < 60 
      ? `${estimatedMinutes} phút` 
      : `${Math.floor(estimatedMinutes / 60)} giờ ${estimatedMinutes % 60} phút`;

    if (!confirm(`⏱️ Sẽ gửi tới ${recipientList.length} người nhận\n\n⏳ Thời gian ước tính: ${estimatedTime}\n(Mỗi email cách nhau 1 phút)\n\nTiếp tục?`)) {
      return;
    }

    setStatus("sending");
    setResults(null);
    setProgress("");

    const signature = `
<p style="margin: 0;">--</p>

<div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #0B5394;">
  <p style="margin: 5px 0;"><strong>Lina Nguyen</strong></p>
  <p style="margin: 5px 0;"><strong>Lehrerin für Deutsch Sprachkurse & Bildungsberaterin</strong></p>

 <p style="margin: 15px 0;">
  <img 
    src="/logo.jpeg"
    width="95" 
    height="96"
    alt="Talent Netzwerk Logo"
    style="display: block; border: 0;">
</p>

  <p style="margin: 5px 0;"><strong>Talent Netzwerk & Talent Netzwerk Akademie</strong></p>
  
  <p style="margin: 5px 0;">44 Derb My Abdellah Ben Hssein, Marrakech 40000, Morocco</p>
  <p style="margin: 5px 0;">12/441 Thien Loi, Hai Phong, 184300 Vietnam</p>
  <p style="margin: 5px 0;">No.1 RT.6/RW.1, Jakarta 12730, Indonesia</p>
  <p style="margin: 5px 0;">90 Bang Bon Nuea, Bang Bon Bangkok 10150, Thailand</p>
  
 <p style="margin: 15px 0 5px 0;">
  Email: 
  <a href="mailto:info@talent-netzwerk.org" 
     style="color: #0B5394; text-decoration: underline;">
    info@talent-netzwerk.org
  </a>
</p>

  <p style="margin: 5px 0;">Web: <a href="https://www.talent-netzwerk.org" style="color: #000000; text-decoration: none;">www.talent-netzwerk.org</a></p>
  <p style="margin: 5px 0;">Tel: <a href="tel:+4917687980845" style="color: #0B5394; text-decoration: none;">+49 17687980845</a></p>
  <p style="margin: 5px 0;">Microsoft Teams: +49 17687980845 - Talent Netzwerk</p>
  <p style="margin: 5px 0;">Whatsapp: <a href="https://wa.me/4917687980845" style="color: #0B5394; text-decoration: none;">+49 17687980845</a></p>
</div>
`;

    const bodyWithSignature = body.replace(/\n/g, "<br>") + signature;

    try {
      const successEmails: string[] = [];
      const failedEmails: string[] = [];

      // Gửi từng email với delay 1 phút
      for (let i = 0; i < recipientList.length; i++) {
        const recipient = recipientList[i];
        const currentIndex = i + 1;
        
        try {
          setProgress(`⏳ [${currentIndex}/${recipientList.length}] Đang gửi tới: ${recipient}...`);

          const formData = new FormData();
          formData.append("subject", subject);
          formData.append("body", bodyWithSignature);
          formData.append("recipient", recipient); // Chỉ gửi 1 email

          attachments.forEach((file) => {
            formData.append("attachments", file);
          });

          const response = await fetch("/api/send-email", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            successEmails.push(recipient);
            setProgress(`✅ [${currentIndex}/${recipientList.length}] Đã gửi thành công tới: ${recipient}`);
          } else {
            failedEmails.push(recipient);
            setProgress(`❌ [${currentIndex}/${recipientList.length}] Lỗi gửi tới: ${recipient}`);
          }

        } catch (error) {
          failedEmails.push(recipient);
          setProgress(`❌ [${currentIndex}/${recipientList.length}] Lỗi gửi tới: ${recipient}`);
        }

        // Delay 60 giây giữa mỗi email (trừ email cuối)
        if (i < recipientList.length - 1) {
          for (let seconds = 60; seconds > 0; seconds--) {
            setProgress(`⏱️ [${currentIndex}/${recipientList.length}] Đã gửi xong! Chờ ${seconds} giây trước khi gửi email tiếp theo...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Hiển thị kết quả cuối cùng
      setResults({
        success: successEmails.length,
        total: recipientList.length,
        failed: failedEmails,
      });
      setStatus("success");
      setProgress(`🎉 Hoàn tất! Đã gửi ${successEmails.length}/${recipientList.length} email`);

    } catch (error: unknown) {
      if (error instanceof Error) {
        alert("❌ Lỗi kết nối: " + error.message);
      }
      setStatus("error");
    }
  };

  // ==============================
  // 🔹 JSX Render
  // ==============================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3">
            <Mail size={32} />
            <h1 className="text-3xl font-bold">Gmail Sender Tool</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Status */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center gap-2">
            {status === "ready" && (
              <CheckCircle className="text-green-500" size={20} />
            )}
            {status === "sending" && (
              <Loader className="text-blue-500 animate-spin" size={20} />
            )}
            {status === "error" && (
              <XCircle className="text-red-500" size={20} />
            )}
            <span className="text-gray-700">
              {status === "ready" && "✅ Sẵn sàng gửi email"}
              {status === "sending" && "⏳ Đang gửi email..."}
              {status === "success" && "✅ Đã gửi xong!"}
              {status === "error" && "❌ Có lỗi xảy ra"}
            </span>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Tiêu đề email:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                         text-gray-800 placeholder-gray-600"
              placeholder="Nhập tiêu đề email..."
            />
          </div>

          {/* Body */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Nội dung email:
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                         resize-none text-gray-800 placeholder-gray-600"
              rows={10}
              placeholder="Nhập nội dung email..."
            />
          </div>

          {/* Recipients */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Danh sách người nhận (mỗi email một dòng):
            </label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                         resize-none text-gray-800 placeholder-gray-600"
              rows={6}
              placeholder={
                "email1@example.com\nemail2@example.com\nemail3@example.com"
              }
            />
          </div>

          {/* Attachments */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Tệp đính kèm:
            </label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Paperclip size={18} />
                Chọn tệp
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <span className="text-gray-600">
                {attachments.length === 0
                  ? "(Chưa có tệp nào)"
                  : `${attachments.length} tệp đã chọn`}
              </span>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">
                      📄 {file.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress */}
          {progress && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-blue-700 font-medium">{progress}</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-800 mb-2">
                ✅ Thành công: {results.success}/{results.total}
              </p>
              {results.failed && results.failed.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold text-red-800">
                    ❌ Lỗi: {results.failed.length}
                  </p>
                  <ul className="text-sm text-red-700 mt-1 ml-4">
                    {results.failed.map((email, i) => (
                      <li key={i}>- {email}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={clearAll}
              disabled={status === "sending"}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 size={18} />
              Xóa hết
            </button>

            <button
              onClick={sendEmails}
              disabled={status === "sending"}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-semibold text-lg transition-colors"
            >
              <Send size={20} />
              {status === "sending" ? "Đang gửi..." : "GỬI EMAIL"}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📝 Hướng dẫn sử dụng
          </h2>
          <ol className="space-y-2 text-gray-700">
            <li>1. Nhập tiêu đề và nội dung email</li>
            <li>2. Thêm danh sách người nhận (mỗi email một dòng)</li>
            <li>3. Tùy chọn: Đính kèm file nếu cần</li>
            <li>4. Nhấn "GỬI EMAIL" để bắt đầu</li>
            <li className="text-orange-600 font-semibold">⚠️ Lưu ý: Mỗi email sẽ được gửi cách nhau 1 phút để tránh spam</li>
          </ol>
        </div>
      </div>
    </div>
  );
}