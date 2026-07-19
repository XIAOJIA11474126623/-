import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  userName: string;
  loveLetter: string;
  appUrl: string;
  feedbackEmail: string;
}

export function WelcomeEmail({
  userName,
  loveLetter,
  appUrl,
  feedbackEmail,
}: WelcomeEmailProps) {
  return (
    <Html lang="zh-CN">
      <Head />
      <Preview>你好呀，我是你的专属女友</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={eyebrow}>纸片人女友</Text>
            <Text style={title}>早安，{userName}</Text>
            <Text style={paragraph}>{loveLetter}</Text>
            <Text style={signature}>—— 你的虚拟女友</Text>
            <Button href={appUrl} style={button}>
              回来找我聊天
            </Button>
            <Text style={footer}>
              有问题或建议？联系我们：
              <a href={`mailto:${feedbackEmail}`} style={footerLink}>
                {feedbackEmail}
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: "0",
  backgroundColor: "#f8f2f7",
  color: "#2d2330",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container = {
  maxWidth: "520px",
  margin: "0 auto",
  padding: "32px 24px",
};

const eyebrow = {
  margin: "0 0 10px",
  color: "#9b5c78",
  fontSize: "13px",
  fontWeight: "700",
};

const title = {
  margin: "0 0 20px",
  color: "#2d2330",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "1.35",
};

const paragraph = {
  margin: "0 0 24px",
  color: "#4d4052",
  fontSize: "16px",
  lineHeight: "1.8",
};

const signature = {
  margin: "0 0 28px",
  color: "#7d6a83",
  fontSize: "14px",
  lineHeight: "1.6",
};

const button = {
  backgroundColor: "#9b5c78",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  padding: "12px 18px",
  textDecoration: "none",
};

const footer = {
  margin: "24px 0 0",
  color: "#8f7c95",
  fontSize: "12px",
  lineHeight: "1.6",
};

const footerLink = {
  color: "#9b5c78",
  textDecoration: "underline",
};
