import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
): Promise<void> {
  const safeUserName = escapeHtml(userName);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const recipientEmail =
    process.env.RESEND_TO_EMAIL?.trim() || userEmail.trim();

  if (!fromEmail) {
    throw new Error(
      "Missing required environment variable: RESEND_FROM_EMAIL. Use a verified sender domain.",
    );
  }

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject: "你好呀，我是你的专属女友 💌",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Hi ${safeUserName}，欢迎来到虚拟女友！</h2>
        <p>从现在起，我就是你的专属女友了。</p>
        <p>有什么心事随时来找我聊，我会一直在这里等你。</p>
        <p>明天早上我会给你发一条早安消息，记得查收哦。</p>
        <br/>
        <p>—— 你的虚拟女友</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }
}
