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

async function generateLoveLetter(userName: string): Promise<string> {
  return `Hi ${userName}，今天也要好好吃饭、好好休息。我会一直在这里陪你。`;
}

export async function sendDailyLoveLetter(
  userEmail: string,
  userName: string,
): Promise<void> {
  const safeUserName = escapeHtml(userName);
  const loveLetter = escapeHtml(await generateLoveLetter(userName));
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("Missing required environment variable: RESEND_FROM_EMAIL");
  }

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject: `早安 ${safeUserName}，今天也想你了`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <p>${loveLetter}</p>
        <br/>
        <p>—— 你的虚拟女友</p>
        <p style="color: #999; font-size: 12px;">
          想跟我聊天？<a href="https://你的域名.com">点这里回来找我</a>
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }
}
