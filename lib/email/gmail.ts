import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { DEFAULT_GMAIL_SENDER_EMAIL } from "./settings";

type SendGmailEmailInput = {
  to: string;
  subject: string;
  text?: string | null;
  html?: string | null;
  from?: string | null;
  replyTo?: string | null;
};

type GmailTransportCredentials = {
  gmailUser: string;
  gmailAppPassword: string;
  senderEmail?: string | null;
};

let cachedTransport: {
  key: string;
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
} | null = null;

function getTransporterFromCredentials(credentials: GmailTransportCredentials) {
  const gmailUser = credentials.gmailUser.trim();
  const gmailAppPassword = credentials.gmailAppPassword.trim();

  if (!gmailUser || !gmailAppPassword) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD");
  }

  const cacheKey = `${gmailUser}:${gmailAppPassword}`;
  if (cachedTransport?.key === cacheKey) {
    return cachedTransport.transporter;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  cachedTransport = { key: cacheKey, transporter };
  return transporter;
}

export async function sendGmailEmail(
  input: SendGmailEmailInput,
  credentials: GmailTransportCredentials
) {
  const transporter = getTransporterFromCredentials(credentials);
  const senderEmail = credentials.senderEmail?.trim() || DEFAULT_GMAIL_SENDER_EMAIL;

  await transporter.sendMail({
    from: input.from || senderEmail,
    to: input.to,
    subject: input.subject,
    text: input.text ?? undefined,
    html: input.html ?? undefined,
    replyTo: input.replyTo ?? undefined,
  });
}
